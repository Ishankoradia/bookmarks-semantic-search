from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class FeedArticleBase(BaseModel):
    url: str
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    image_url: Optional[str] = None
    topic: Optional[str] = None
    source_type: Optional[str] = None
    published_at: Optional[datetime] = None


class FeedArticleCreate(FeedArticleBase):
    content: Optional[str] = None


class FeedArticleResponse(FeedArticleBase):
    id: UUID
    user_id: int
    is_saved: bool = False
    is_not_interested: bool = False
    fetched_at: datetime

    class Config:
        from_attributes = True


class FeedArticleListResponse(BaseModel):
    articles: List[FeedArticleResponse]
    total: int
    has_more: bool = False


class FeedRefreshResponse(BaseModel):
    message: str
    articles_fetched: int
    articles_new: int
