"""create_jobs_table

Revision ID: 3b8d61a3a54e
Revises: a20cd48d5d8e
Create Date: 2025-12-05 13:30:38.931425

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b8d61a3a54e'
down_revision: Union[str, Sequence[str], None] = 'a20cd48d5d8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create jobs table with string columns instead of enums
    op.create_table('jobs',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('progress_current', sa.Integer(), nullable=True),
        sa.Column('progress_total', sa.Integer(), nullable=True),
        sa.Column('progress_percentage', sa.Integer(), nullable=True),
        sa.Column('current_item', sa.String(length=500), nullable=True),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_jobs_job_type', 'jobs', ['job_type'])
    op.create_index('ix_jobs_status', 'jobs', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_jobs_status', table_name='jobs')
    op.drop_index('ix_jobs_job_type', table_name='jobs')
    op.drop_table('jobs')
