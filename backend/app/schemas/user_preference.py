from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Available topics for user interests
AVAILABLE_TOPICS = [
    "Technology",
    "Programming",
    "AI & Machine Learning",
    "Startups & Business",
    "Product & Design",
    "DevOps & Cloud",
    "Career & Growth",
    "Science",
    "Finance & Investing",
    "Productivity",
]


class UserPreferenceBase(BaseModel):
    interests: List[str] = Field(default=[], description="List of topics the user is interested in")


class UserPreferenceCreate(UserPreferenceBase):
    pass


class UserPreferenceUpdate(BaseModel):
    interests: Optional[List[str]] = Field(default=None, description="List of topics the user is interested in")


class UserPreferenceResponse(UserPreferenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TopicsListResponse(BaseModel):
    topics: List[str] = Field(description="List of available topics")
