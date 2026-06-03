"""
Merge two users - move all artifacts from source user into target user,
then delete the source user.

Usage (from backend/ or via docker):
    python -m scripts.merge_users --keep user1@example.com --delete user2@example.com
"""
import sys
import argparse

sys.path.insert(0, ".")

from sqlalchemy import and_
from app.core.database import SessionLocal
from app.models.user import User
from app.models.bookmark import Bookmark
from app.models.feed_article import FeedArticle
from app.models.user_preference import UserPreference
from app.models.follow import FollowRelationship
from app.services.user_service import UserService


def main():
    parser = argparse.ArgumentParser(description="Merge two users. Moves all data from --delete user into --keep user.")
    parser.add_argument("--keep", required=True, help="Email of the user to keep")
    parser.add_argument("--delete", required=True, help="Email of the user to delete (their data moves to --keep)")
    args = parser.parse_args()

    target_email = args.keep
    source_email = args.delete

    if target_email == source_email:
        print("Target and source emails cannot be the same.")
        sys.exit(1)

    db = SessionLocal()
    user_service = UserService()

    try:
        target = user_service.get_user_by_email(db, target_email)
        source = user_service.get_user_by_email(db, source_email)

        if not target:
            print(f"Target user not found: {target_email}")
            sys.exit(1)
        if not source:
            print(f"Source user not found: {source_email}")
            sys.exit(1)

        target_stats = user_service.get_user_stats(db, target)
        source_stats = user_service.get_user_stats(db, source)

        print(f"Target: {target.email} (id={target.id})")
        print(f"  bookmarks={target_stats['bookmarks']}, feed_articles={target_stats['feed_articles']}")
        print(f"Source: {source.email} (id={source.id})")
        print(f"  bookmarks={source_stats['bookmarks']}, feed_articles={source_stats['feed_articles']}")
        print(f"\nAll artifacts from {source.email} will be merged into {target.email}.")
        print(f"{source.email} will be deleted after merge.")

        confirm = input("\nProceed? (y/N): ")
        if confirm.lower() != "y":
            print("Aborted.")
            sys.exit(0)

        # 1. Bookmarks - move non-duplicate, delete duplicates
        target_urls = {
            b.url for b in db.query(Bookmark.url).filter(Bookmark.user_id == target.id).all()
        }
        source_bookmarks = db.query(Bookmark).filter(Bookmark.user_id == source.id).all()
        moved_bookmarks = 0
        skipped_bookmarks = 0
        for bookmark in source_bookmarks:
            if bookmark.url in target_urls:
                db.delete(bookmark)
                skipped_bookmarks += 1
            else:
                bookmark.user_id = target.id
                target_urls.add(bookmark.url)
                moved_bookmarks += 1
        print(f"  Bookmarks: moved={moved_bookmarks}, skipped duplicates={skipped_bookmarks}")

        # 2. Feed articles - move non-duplicate, delete duplicates
        target_feed_urls = {
            a.url for a in db.query(FeedArticle.url).filter(FeedArticle.user_id == target.id).all()
        }
        source_articles = db.query(FeedArticle).filter(FeedArticle.user_id == source.id).all()
        moved_articles = 0
        skipped_articles = 0
        for article in source_articles:
            if article.url in target_feed_urls:
                db.delete(article)
                skipped_articles += 1
            else:
                article.user_id = target.id
                target_feed_urls.add(article.url)
                moved_articles += 1
        print(f"  Feed articles: moved={moved_articles}, skipped duplicates={skipped_articles}")

        # 3. User preferences - keep target's, delete source's
        db.query(UserPreference).filter(UserPreference.user_id == source.id).delete()
        print(f"  Preferences: kept target's")

        # 4. Follow relationships - reassign, skip duplicates and self-follows
        follows = db.query(FollowRelationship).filter(
            (FollowRelationship.follower_id == source.id) |
            (FollowRelationship.following_id == source.id)
        ).all()
        moved_follows = 0
        for follow in follows:
            new_follower = target.id if follow.follower_id == source.id else follow.follower_id
            new_following = target.id if follow.following_id == source.id else follow.following_id
            # Skip self-follows
            if new_follower == new_following:
                db.delete(follow)
                continue
            # Skip if relationship already exists
            existing = db.query(FollowRelationship).filter(
                FollowRelationship.follower_id == new_follower,
                FollowRelationship.following_id == new_following,
            ).first()
            if existing:
                db.delete(follow)
                continue
            follow.follower_id = new_follower
            follow.following_id = new_following
            moved_follows += 1
        print(f"  Follow relationships: moved={moved_follows}")

        # 5. Delete source user
        db.delete(source)
        db.commit()
        print(f"\nDone. {source_email} merged into {target_email} and deleted.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
