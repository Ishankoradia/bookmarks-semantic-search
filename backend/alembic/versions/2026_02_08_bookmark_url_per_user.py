"""Change bookmarks unique constraint from url to (url, user_id)

Revision ID: 2beacd71b5b3
Revises: add_follow_relationships
Create Date: 2026-02-08 15:03:46.344592

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "bookmark_url_per_user"
down_revision: Union[str, Sequence[str], None] = "add_follow_relationships"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop unique index on url (if exists)
    op.execute("DROP INDEX IF EXISTS ix_bookmarks_url")
    # Create non-unique index on url (if not exists)
    op.execute("CREATE INDEX IF NOT EXISTS ix_bookmarks_url ON bookmarks (url)")
    # Add unique constraint on (url, user_id) if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bookmark_url_user') THEN
                ALTER TABLE bookmarks ADD CONSTRAINT uq_bookmark_url_user UNIQUE (url, user_id);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Drop unique constraint on (url, user_id)
    op.drop_constraint("uq_bookmark_url_user", "bookmarks", type_="unique")
    # Drop non-unique index on url
    op.drop_index("ix_bookmarks_url", table_name="bookmarks")
    # Recreate unique index on url
    op.create_index("ix_bookmarks_url", "bookmarks", ["url"], unique=True)
