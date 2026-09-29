from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.core.topic_sources import TOPIC_SOURCES


# Available topics for user interests — derived from the source map so the two
# can never drift. Add a new topic in topic_sources.py and it shows up here.
AVAILABLE_TOPICS = list(TOPIC_SOURCES.keys())


class UserPreferenceBase(BaseModel):
    interests: List[str] = Field(default=[], description="List of topics the user is interested in")
    is_discoverable: bool = Field(default=True, description="Whether the user can be found by other users")


class UserPreferenceCreate(UserPreferenceBase):
    pass


class UserPreferenceUpdate(BaseModel):
    interests: Optional[List[str]] = Field(default=None, description="List of topics the user is interested in")
    is_discoverable: Optional[bool] = Field(default=None, description="Whether the user can be found by other users")


class UserPreferenceResponse(UserPreferenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TopicsListResponse(BaseModel):
    topics: List[str] = Field(description="List of available topics")
