from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from uuid import UUID
from datetime import datetime

from app.models.user import User
from app.models.user_preference import UserPreference
from app.models.follow import FollowRelationship, FollowStatus
from app.models.bookmark import Bookmark
from app.schemas.follow import (
    UserSummary,
    FollowRequestResponse,
    FollowListResponse,
    PendingRequestsResponse,
    UserProfileResponse,
    FollowStatusEnum,
    FriendBookmark,
    FriendsFeedResponse,
)
from app.core.logging import get_logger
from fastapi import HTTPException, status


class FollowService:
    def __init__(self):
        self.logger = get_logger(__name__)

    def _user_to_summary(self, user: User) -> UserSummary:
        """Convert User model to UserSummary schema."""
        return UserSummary(
            uuid=user.uuid,
            name=user.name,
            email=user.email,
            picture=user.picture
        )

    def _relationship_to_response(self, rel: FollowRelationship) -> FollowRequestResponse:
        """Convert FollowRelationship model to FollowRequestResponse schema."""
        return FollowRequestResponse(
            id=rel.id,
            follower=self._user_to_summary(rel.follower),
            following=self._user_to_summary(rel.following),
            status=FollowStatusEnum(rel.status.value),
            created_at=rel.created_at,
            responded_at=rel.responded_at
        )

    async def create_follow_request(
        self, db: Session, follower_id: int, following_uuid: UUID
    ) -> FollowRequestResponse:
        """Create a new follow request."""
        # Get target user
        target_user = db.query(User).filter(User.uuid == following_uuid).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if target_user.id == follower_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot follow yourself"
            )

        # Check if relationship already exists
        existing = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == follower_id,
            FollowRelationship.following_id == target_user.id
        ).first()

        if existing:
            if existing.status == FollowStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Follow request already pending"
                )
            elif existing.status == FollowStatus.ACCEPTED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Already following this user"
                )
            else:
                # Rejected - allow re-request by updating status
                existing.status = FollowStatus.PENDING
                existing.responded_at = None
                existing.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(existing)
                return self._relationship_to_response(existing)

        # Create new request
        follow = FollowRelationship(
            follower_id=follower_id,
            following_id=target_user.id,
            status=FollowStatus.PENDING
        )
        db.add(follow)
        db.commit()
        db.refresh(follow)
        return self._relationship_to_response(follow)

    async def respond_to_request(
        self, db: Session, request_id: int, user_id: int, new_status: FollowStatusEnum
    ) -> FollowRequestResponse:
        """Accept or reject a follow request."""
        request = db.query(FollowRelationship).filter(
            FollowRelationship.id == request_id,
            FollowRelationship.following_id == user_id,  # Only recipient can respond
            FollowRelationship.status == FollowStatus.PENDING
        ).first()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Follow request not found or already processed"
            )

        if new_status not in [FollowStatusEnum.ACCEPTED, FollowStatusEnum.REJECTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be 'accepted' or 'rejected'"
            )

        request.status = FollowStatus(new_status.value)
        request.responded_at = datetime.utcnow()
        db.commit()
        db.refresh(request)
        return self._relationship_to_response(request)

    async def cancel_request(self, db: Session, request_id: int, user_id: int) -> dict:
        """Cancel a pending follow request."""
        request = db.query(FollowRelationship).filter(
            FollowRelationship.id == request_id,
            FollowRelationship.follower_id == user_id,  # Only sender can cancel
            FollowRelationship.status == FollowStatus.PENDING
        ).first()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Follow request not found or already processed"
            )

        db.delete(request)
        db.commit()
        return {"message": "Follow request cancelled"}

    async def get_sent_pending_requests(
        self, db: Session, user_id: int
    ) -> PendingRequestsResponse:
        """Get follow requests sent by the user that are still pending."""
        query = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == user_id,
            FollowRelationship.status == FollowStatus.PENDING
        ).order_by(FollowRelationship.created_at.desc())

        total = query.count()
        requests = query.all()

        return PendingRequestsResponse(
            requests=[self._relationship_to_response(r) for r in requests],
            total=total
        )

    async def get_received_pending_requests(
        self, db: Session, user_id: int
    ) -> PendingRequestsResponse:
        """Get pending follow requests received by the user."""
        query = db.query(FollowRelationship).filter(
            FollowRelationship.following_id == user_id,
            FollowRelationship.status == FollowStatus.PENDING
        ).order_by(FollowRelationship.created_at.desc())

        total = query.count()
        requests = query.all()

        return PendingRequestsResponse(
            requests=[self._relationship_to_response(r) for r in requests],
            total=total
        )

    async def get_followers(
        self, db: Session, user_id: int, skip: int = 0, limit: int = 50
    ) -> FollowListResponse:
        """Get users who follow this user (accepted only)."""
        query = db.query(FollowRelationship).filter(
            FollowRelationship.following_id == user_id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        )
        total = query.count()
        relationships = query.offset(skip).limit(limit).all()
        users = [self._user_to_summary(rel.follower) for rel in relationships]
        return FollowListResponse(users=users, total=total)

    async def get_following(
        self, db: Session, user_id: int, skip: int = 0, limit: int = 50
    ) -> FollowListResponse:
        """Get users this user follows (accepted only)."""
        query = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == user_id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        )
        total = query.count()
        relationships = query.offset(skip).limit(limit).all()
        users = [self._user_to_summary(rel.following) for rel in relationships]
        return FollowListResponse(users=users, total=total)

    async def unfollow(self, db: Session, user_id: int, target_uuid: UUID) -> dict:
        """Unfollow a user by deleting the relationship."""
        target_user = db.query(User).filter(User.uuid == target_uuid).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        relationship = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == user_id,
            FollowRelationship.following_id == target_user.id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        ).first()

        if not relationship:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not following this user"
            )

        db.delete(relationship)
        db.commit()
        return {"message": "Successfully unfollowed"}

    async def remove_follower(self, db: Session, user_id: int, follower_uuid: UUID) -> dict:
        """Remove a follower by deleting the relationship."""
        follower_user = db.query(User).filter(User.uuid == follower_uuid).first()
        if not follower_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        relationship = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == follower_user.id,
            FollowRelationship.following_id == user_id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        ).first()

        if not relationship:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This user is not following you"
            )

        db.delete(relationship)
        db.commit()
        return {"message": "Follower removed"}

    async def get_user_profile(
        self, db: Session, current_user_id: int, target_uuid: UUID
    ) -> UserProfileResponse:
        """Get user profile with follow information."""
        target_user = db.query(User).filter(User.uuid == target_uuid).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Count followers and following
        followers_count = db.query(FollowRelationship).filter(
            FollowRelationship.following_id == target_user.id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        ).count()

        following_count = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == target_user.id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        ).count()

        # Check if current user follows target
        is_following = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == current_user_id,
            FollowRelationship.following_id == target_user.id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        ).first() is not None

        # Check if target follows current user
        is_followed_by = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == target_user.id,
            FollowRelationship.following_id == current_user_id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        ).first() is not None

        # Check for pending request from current user to target
        pending_request = db.query(FollowRelationship).filter(
            FollowRelationship.follower_id == current_user_id,
            FollowRelationship.following_id == target_user.id,
            FollowRelationship.status == FollowStatus.PENDING
        ).first()

        return UserProfileResponse(
            uuid=target_user.uuid,
            name=target_user.name,
            email=target_user.email,
            picture=target_user.picture,
            followers_count=followers_count,
            following_count=following_count,
            is_following=is_following,
            is_followed_by=is_followed_by,
            follow_request_status=FollowStatusEnum.PENDING if pending_request else None,
            follow_request_id=pending_request.id if pending_request else None
        )

    async def search_users(
        self, db: Session, current_user_id: int, query: str, skip: int = 0, limit: int = 20
    ) -> List[UserProfileResponse]:
        """Search users by name or email. Only returns discoverable users."""
        # Join with preferences to check discoverability
        users = db.query(User).outerjoin(
            UserPreference, User.id == UserPreference.user_id
        ).filter(
            User.id != current_user_id,
            or_(
                UserPreference.is_discoverable == True,
                UserPreference.id == None  # Users without preferences are discoverable by default
            ),
            or_(
                User.name.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%")
            )
        ).offset(skip).limit(limit).all()

        # Get profile info for each user
        result = []
        for user in users:
            profile = await self.get_user_profile(db, current_user_id, user.uuid)
            result.append(profile)

        return result

    async def get_friends_feed(
        self, db: Session, user_id: int, skip: int = 0, limit: int = 20
    ) -> FriendsFeedResponse:
        """Get bookmarks from all users the current user follows."""
        # Get IDs of users being followed
        following_ids = db.query(FollowRelationship.following_id).filter(
            FollowRelationship.follower_id == user_id,
            FollowRelationship.status == FollowStatus.ACCEPTED
        ).subquery()

        # Get bookmarks from followed users
        query = db.query(Bookmark).filter(
            Bookmark.user_id.in_(following_ids)
        ).order_by(Bookmark.created_at.desc())

        total = query.count()
        bookmarks = query.offset(skip).limit(limit + 1).all()  # Fetch one extra to check has_more

        has_more = len(bookmarks) > limit
        if has_more:
            bookmarks = bookmarks[:limit]

        # Build response with owner info
        result_bookmarks = []
        for bookmark in bookmarks:
            result_bookmarks.append(FriendBookmark(
                id=bookmark.id,
                url=bookmark.url,
                title=bookmark.title,
                description=bookmark.description,
                domain=bookmark.domain,
                tags=bookmark.tags or [],
                category=bookmark.category,
                created_at=bookmark.created_at,
                owner=self._user_to_summary(bookmark.user)
            ))

        return FriendsFeedResponse(
            bookmarks=result_bookmarks,
            total=total,
            has_more=has_more
        )

    async def get_pending_requests_count(self, db: Session, user_id: int) -> int:
        """Get count of pending follow requests received."""
        return db.query(FollowRelationship).filter(
            FollowRelationship.following_id == user_id,
            FollowRelationship.status == FollowStatus.PENDING
        ).count()


# Singleton instance
follow_service = FollowService()
