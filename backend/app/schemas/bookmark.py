from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from enum import Enum

class BookmarkBase(BaseModel):
    url: HttpUrl
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    meta_data: Dict[str, Any] = Field(default_factory=dict)
    is_read: Optional[bool] = False
    reference: Optional[str] = None

class BookmarkCreate(BaseModel):
    url: HttpUrl
    reference: Optional[str] = None

class BookmarkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    meta_data: Optional[Dict[str, Any]] = None
    is_read: Optional[bool] = None
    reference: Optional[str] = None

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

class DateRangeFilter(str, Enum):
    today = "today"
    last_week = "last_week"
    last_month = "last_month"
    last_3_months = "last_3_months"
    last_year = "last_year"
    all_time = "all_time"

class MetadataFilters(BaseModel):
    reference: Optional[str] = Field(default=None, description="Filter by reference/source (partial match)")
    domain: Optional[str] = Field(default=None, description="Filter by domain (regex match)")
    date_range: Optional[DateRangeFilter] = Field(default=None, description="Filter by creation date")
    date_from: Optional[date] = Field(default=None, description="Custom date range start")
    date_to: Optional[date] = Field(default=None, description="Custom date range end")

class SearchQuery(BaseModel):
    query: str
    limit: int = Field(default=10, ge=1, le=100)
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    filters: Optional[MetadataFilters] = Field(default=None, description="Metadata filters to apply before vector search")

class ParsedSearchQuery(BaseModel):
    domain_filter: Optional[str] = None
    reference_filter: Optional[str] = None
    date_range: Optional[DateRangeFilter] = None
    ambiguous_person_name: Optional[str] = None

class ReadStatusUpdate(BaseModel):
    is_read: bool

class TagPreviewRequest(BaseModel):
    url: HttpUrl

class TagPreviewResponse(BaseModel):
    tags: List[str]
    title: str
    description: Optional[str] = None
    domain: str