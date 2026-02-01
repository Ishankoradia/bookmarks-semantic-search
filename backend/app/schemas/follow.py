from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class FollowStatusEnum(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


# Reusable user summary for follow-related responses
class UserSummary(BaseModel):
    uuid: UUID
    name: Optional[str] = None
    email: str
    picture: Optional[str] = None

    class Config:
        from_attributes = True


# Request to send a follow request
class FollowRequestCreate(BaseModel):
    user_uuid: UUID = Field(description="UUID of the user to follow")


# Request to respond to a follow request
class FollowRequestUpdate(BaseModel):
    status: FollowStatusEnum = Field(description="Accept or reject the follow request")


# Follow request details
class FollowRequestResponse(BaseModel):
    id: int
    follower: UserSummary
    following: UserSummary
    status: FollowStatusEnum
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# List of followers or following
class FollowListResponse(BaseModel):
    users: List[UserSummary]
    total: int


# Pending requests list
class PendingRequestsResponse(BaseModel):
    requests: List[FollowRequestResponse]
    total: int


# User profile with follow stats (used when viewing another user)
class UserProfileResponse(UserSummary):
    followers_count: int = 0
    following_count: int = 0
    is_following: Optional[bool] = None  # Current user follows this user
    is_followed_by: Optional[bool] = None  # This user follows current user
    follow_request_status: Optional[FollowStatusEnum] = None  # Pending request status if any
    follow_request_id: Optional[int] = None  # Request ID if there's a pending request


# Bookmark with owner info for friends feed
class FriendBookmark(BaseModel):
    id: UUID
    url: str
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None
    created_at: datetime
    owner: UserSummary  # Who owns this bookmark

    class Config:
        from_attributes = True


# Friends feed response
class FriendsFeedResponse(BaseModel):
    bookmarks: List[FriendBookmark]
    total: int
    has_more: bool
