from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.bookmark import Bookmark
from app.models.user_preference import UserPreference
from app.models.feed_article import FeedArticle
from app.models.follow import FollowRelationship
from app.core.logging import get_logger


class UserService:
    def __init__(self):
        self.logger = get_logger(__name__)

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get a user by email address."""
        return db.query(User).filter(User.email == email).first()

    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """Get a user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    def get_user_stats(self, db: Session, user: User) -> Dict:
        """Get counts of all related data for a user."""
        bookmark_count = db.query(Bookmark).filter(Bookmark.user_id == user.id).count()
        feed_article_count = db.query(FeedArticle).filter(FeedArticle.user_id == user.id).count()
        has_preferences = db.query(UserPreference).filter(UserPreference.user_id == user.id).first() is not None
        following_count = db.query(FollowRelationship).filter(FollowRelationship.follower_id == user.id).count()
        followers_count = db.query(FollowRelationship).filter(FollowRelationship.following_id == user.id).count()

        return {
            "bookmarks": bookmark_count,
            "feed_articles": feed_article_count,
            "has_preferences": has_preferences,
            "following": following_count,
            "followers": followers_count,
        }

    def delete_user(self, db: Session, user: User) -> bool:
        """
        Delete a user and all their related data.

        Deletes in order to respect foreign key constraints:
        1. Feed articles
        2. Bookmarks
        3. User preferences
        4. Follow relationships (both as follower and following)
        5. User

        Returns True if successful, raises exception on failure.
        """
        try:
            user_id = user.id
            email = user.email

            # Delete feed articles
            deleted_feed = db.query(FeedArticle).filter(FeedArticle.user_id == user_id).delete()
            self.logger.info(f"Deleted {deleted_feed} feed articles for user {email}")

            # Delete bookmarks
            deleted_bookmarks = db.query(Bookmark).filter(Bookmark.user_id == user_id).delete()
            self.logger.info(f"Deleted {deleted_bookmarks} bookmarks for user {email}")

            # Delete preferences
            deleted_prefs = db.query(UserPreference).filter(UserPreference.user_id == user_id).delete()
            self.logger.info(f"Deleted {deleted_prefs} preference records for user {email}")

            # Delete follow relationships (both directions)
            deleted_following = db.query(FollowRelationship).filter(
                FollowRelationship.follower_id == user_id
            ).delete()
            deleted_followers = db.query(FollowRelationship).filter(
                FollowRelationship.following_id == user_id
            ).delete()
            self.logger.info(f"Deleted {deleted_following + deleted_followers} follow relationships for user {email}")

            # Delete the user
            db.delete(user)
            db.commit()

            self.logger.info(f"Successfully deleted user {email}")
            return True

        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to delete user: {e}")
            raise
