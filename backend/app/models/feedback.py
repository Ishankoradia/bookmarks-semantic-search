from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class FeedbackType(str, enum.Enum):
    feedback = "feedback"
    bug = "bug"
    feature = "feature"
    account_deletion = "account_deletion"


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for deleted users
    user_email = Column(String, nullable=False)  # persist email even after deletion
    type = Column(Enum(FeedbackType), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
