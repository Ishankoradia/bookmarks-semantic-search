from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.follow import (
    FollowRequestCreate,
    FollowRequestResponse,
    FollowRequestUpdate,
    FollowListResponse,
    PendingRequestsResponse,
    UserProfileResponse,
)
from app.services.follow_service import follow_service

router = APIRouter()


@router.post("/request", response_model=FollowRequestResponse)
async def send_follow_request(
    request: FollowRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a follow request to another user."""
    return await follow_service.create_follow_request(db, current_user.id, request.user_uuid)


@router.get("/requests/pending", response_model=PendingRequestsResponse)
async def get_sent_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get follow requests I've sent that are still pending."""
    return await follow_service.get_sent_pending_requests(db, current_user.id)


@router.get("/requests/received", response_model=PendingRequestsResponse)
async def get_received_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get pending follow requests I've received."""
    return await follow_service.get_received_pending_requests(db, current_user.id)


@router.get("/requests/count")
async def get_pending_requests_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of pending follow requests received."""
    count = await follow_service.get_pending_requests_count(db, current_user.id)
    return {"count": count}


@router.put("/requests/{request_id}", response_model=FollowRequestResponse)
async def respond_to_follow_request(
    request_id: int,
    response: FollowRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept or reject a follow request."""
    return await follow_service.respond_to_request(db, request_id, current_user.id, response.status)


@router.delete("/requests/{request_id}")
async def cancel_follow_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a pending follow request I sent."""
    return await follow_service.cancel_request(db, request_id, current_user.id)


@router.get("/followers", response_model=FollowListResponse)
async def get_followers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of users who follow me."""
    return await follow_service.get_followers(db, current_user.id, skip, limit)


@router.get("/following", response_model=FollowListResponse)
async def get_following(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of users I follow."""
    return await follow_service.get_following(db, current_user.id, skip, limit)


@router.delete("/following/{user_uuid}")
async def unfollow_user(
    user_uuid: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unfollow a user."""
    return await follow_service.unfollow(db, current_user.id, user_uuid)


@router.delete("/followers/{user_uuid}")
async def remove_follower(
    user_uuid: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove someone from my followers."""
    return await follow_service.remove_follower(db, current_user.id, user_uuid)


@router.get("/users/{user_uuid}/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user_uuid: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user profile with follow information."""
    return await follow_service.get_user_profile(db, current_user.id, user_uuid)


@router.get("/search", response_model=List[UserProfileResponse])
async def search_users(
    q: str = Query(..., min_length=2),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search users by name or email."""
    return await follow_service.search_users(db, current_user.id, q, skip, limit)
