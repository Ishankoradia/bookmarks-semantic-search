#!/usr/bin/env python3
"""
Script to delete a user and all their related data.

Usage:
    uv run python app/scripts/delete_user.py <email>
    uv run python app/scripts/delete_user.py <email> --dry-run  # Preview without deleting
    uv run python app/scripts/delete_user.py <email> --force    # Skip confirmation prompt
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.services.user_service import UserService


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: uv run python scripts/delete_user.py <email> [--dry-run] [--force]"
        )
        sys.exit(1)

    email = sys.argv[1]
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv

    if dry_run:
        print("[DRY RUN MODE - No data will be deleted]\n")

    db = SessionLocal()
    user_service = UserService()

    try:
        # Find the user
        user = user_service.get_user_by_email(db, email)

        if not user:
            print(f"User with email '{email}' not found.")
            sys.exit(1)

        # Display user info
        print(f"User found:")
        print(f"  ID: {user.id}")
        print(f"  UUID: {user.uuid}")
        print(f"  Email: {user.email}")
        print(f"  Name: {user.name}")
        print(f"  Created: {user.created_at}")

        # Get and display stats
        stats = user_service.get_user_stats(db, user)
        print(f"\nRelated data to be deleted:")
        print(f"  Bookmarks: {stats['bookmarks']}")
        print(f"  Feed articles: {stats['feed_articles']}")
        print(f"  Preferences: {'Yes' if stats['has_preferences'] else 'No'}")
        print(f"  Following: {stats['following']}")
        print(f"  Followers: {stats['followers']}")

        if dry_run:
            print("\n[DRY RUN] No data was deleted.")
            sys.exit(0)

        # Confirm deletion
        if not force:
            confirm = input(
                "\nAre you sure you want to delete this user and all their data? (yes/no): "
            )
            if confirm.lower() != "yes":
                print("Deletion cancelled.")
                sys.exit(0)

        # Delete the user
        print("\nDeleting user...")
        user_service.delete_user(db, user)
        print(f"User '{email}' and all related data have been deleted.")

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
