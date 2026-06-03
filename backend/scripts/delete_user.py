"""
Delete a user and all their artifacts by email.

Usage (from backend/):
    python -m scripts.delete_user user@example.com
"""
import sys

sys.path.insert(0, ".")

from app.core.database import SessionLocal
from app.models.user import User
from app.services.user_service import UserService


def main():
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.delete_user <email>")
        sys.exit(1)

    email = sys.argv[1]
    db = SessionLocal()
    user_service = UserService()

    try:
        user = user_service.get_user_by_email(db, email)
        if not user:
            print(f"No user found with email: {email}")
            sys.exit(1)

        stats = user_service.get_user_stats(db, user)
        print(f"User: {user.email} (id={user.id})")
        print(f"  bookmarks={stats['bookmarks']}, feed_articles={stats['feed_articles']}, "
              f"following={stats['following']}, followers={stats['followers']}")

        confirm = input("\nDelete this user and all their data? (y/N): ")
        if confirm.lower() != "y":
            print("Aborted.")
            sys.exit(0)

        user_service.delete_user(db, user)
        print(f"Deleted {user.email} and all associated data.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
