from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class BookmarkBase(BaseModel):
    url: HttpUrl
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    meta_data: Dict[str, Any] = Field(default_factory=dict)
    is_read: Optional[bool] = False

class BookmarkCreate(BaseModel):
    url: HttpUrl

class BookmarkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    meta_data: Optional[Dict[str, Any]] = None
    is_read: Optional[bool] = None

class BookmarkInDB(BookmarkBase):
    id: UUID
    domain: str
    content: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BookmarkResponse(BookmarkInDB):
    pass

class BookmarkSearchResult(BookmarkResponse):
    similarity_score: float

class SearchQuery(BaseModel):
    query: str
    limit: int = Field(default=10, ge=1, le=100)
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)

class ReadStatusUpdate(BaseModel):
    is_read: bool

class TagPreviewRequest(BaseModel):
    url: HttpUrl

class TagPreviewResponse(BaseModel):
    tags: List[str]
    title: str
    description: Optional[str] = None
    domain: str