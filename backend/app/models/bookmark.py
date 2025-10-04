from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    content = Column(Text)
    raw_html = Column(Text)  # Store raw HTML content
    domain = Column(String)
    
    embedding = Column(Vector(1536))
    
    tags = Column(JSON, default=[])
    meta_data = Column(JSON, default={})
    is_read = Column(Boolean, default=False, nullable=True)
    reference = Column(Text, nullable=True)  # How user found this bookmark
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Bookmark {self.title}>"