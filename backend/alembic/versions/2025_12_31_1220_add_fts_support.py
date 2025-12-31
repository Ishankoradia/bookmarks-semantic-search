"""add_fts_support

Revision ID: add_fts_support
Revises: e2d7f9ead3c5
Create Date: 2025-12-31
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_fts_support'
down_revision = 'e2d7f9ead3c5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add generated tsvector column for full-text search
    op.execute("""
        ALTER TABLE bookmarks
        ADD COLUMN search_vector TSVECTOR
        GENERATED ALWAYS AS (
            to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE(reference, ''))
        ) STORED
    """)

    # Create GIN index for fast full-text search
    op.create_index(
        'idx_bookmarks_search_vector',
        'bookmarks',
        ['search_vector'],
        postgresql_using='gin'
    )


def downgrade() -> None:
    op.drop_index('idx_bookmarks_search_vector', table_name='bookmarks')
    op.drop_column('bookmarks', 'search_vector')
