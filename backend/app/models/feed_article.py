from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class FeedArticle(Base):
    __tablename__ = "feed_articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Article data
    url = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    content = Column(Text)
    domain = Column(String)
    image_url = Column(String)  # og:image for card display

    # Metadata
    topic = Column(String)  # Which interest it matched (e.g., "Technology")
    source_type = Column(String)  # "rss" or "hn"
    published_at = Column(DateTime(timezone=True))
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    # User interaction
    is_saved = Column(Boolean, default=False)  # User saved to bookmarks
    is_not_interested = Column(Boolean, default=False)  # User marked as not interested

    # Relationship
    user = relationship("User", back_populates="feed_articles")

    # Composite unique constraint - one article per user
    __table_args__ = (
        UniqueConstraint('user_id', 'url', name='uq_user_feed_article_url'),
    )

    def __repr__(self):
        return f"<FeedArticle {self.title[:30]}...>"
