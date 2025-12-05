"""add_category_field_to_bookmarks

Revision ID: a20cd48d5d8e
Revises: e58a5cdb9066
Create Date: 2025-12-05 11:02:46.225912

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a20cd48d5d8e'
down_revision: Union[str, Sequence[str], None] = 'e58a5cdb9066'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bookmarks', sa.Column('category', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bookmarks', 'category')
