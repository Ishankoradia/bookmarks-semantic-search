"""Add indexes for metadata filtering

Revision ID: e58a5cdb9066
Revises: 100ad4ecc52f
Create Date: 2025-10-04 17:33:34.189916

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e58a5cdb9066'
down_revision: Union[str, Sequence[str], None] = '100ad4ecc52f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create indexes for metadata filtering
    op.create_index('idx_bookmarks_reference', 'bookmarks', ['reference'])
    op.create_index('idx_bookmarks_domain', 'bookmarks', ['domain'])
    op.create_index('idx_bookmarks_created_at', 'bookmarks', ['created_at'])
    # Composite index for common filter combinations
    op.create_index('idx_bookmarks_domain_created', 'bookmarks', ['domain', 'created_at'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_bookmarks_domain_created', 'bookmarks')
    op.drop_index('idx_bookmarks_created_at', 'bookmarks')
    op.drop_index('idx_bookmarks_domain', 'bookmarks')
    op.drop_index('idx_bookmarks_reference', 'bookmarks')
