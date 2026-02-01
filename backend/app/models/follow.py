from sqlalchemy import Column, Integer, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class FollowStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class FollowRelationship(Base):
    __tablename__ = "follow_relationships"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # The user who initiated the follow request
    follower_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # The user being followed
    following_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    status = Column(
        Enum(
            FollowStatus,
            name='followstatus',
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False
        ),
        default=FollowStatus.PENDING,
        nullable=False,
        index=True
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # When the request was accepted/rejected
    responded_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], backref="following_relationships")
    following = relationship("User", foreign_keys=[following_id], backref="follower_relationships")

    __table_args__ = (
        UniqueConstraint('follower_id', 'following_id', name='uq_follower_following'),
    )

    def __repr__(self):
        return f"<FollowRelationship follower={self.follower_id} -> following={self.following_id} status={self.status}>"
