"""add_follow_relationships

Revision ID: add_follow_relationships
Revises: add_explore_feed
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_follow_relationships'
down_revision = 'add_explore_feed'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create follow_relationships table
    op.create_table(
        'follow_relationships',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('follower_id', sa.Integer(), nullable=False),
        sa.Column('following_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'accepted', 'rejected', name='followstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['follower_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['following_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'following_id', name='uq_follower_following')
    )

    # Create indexes for efficient lookups
    op.create_index('ix_follow_relationships_follower_id', 'follow_relationships', ['follower_id'])
    op.create_index('ix_follow_relationships_following_id', 'follow_relationships', ['following_id'])
    op.create_index('ix_follow_relationships_status', 'follow_relationships', ['status'])

    # Add is_discoverable to user_preferences
    op.add_column('user_preferences', sa.Column('is_discoverable', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    # Remove is_discoverable from user_preferences
    op.drop_column('user_preferences', 'is_discoverable')

    # Drop indexes
    op.drop_index('ix_follow_relationships_status', table_name='follow_relationships')
    op.drop_index('ix_follow_relationships_following_id', table_name='follow_relationships')
    op.drop_index('ix_follow_relationships_follower_id', table_name='follow_relationships')

    # Drop table
    op.drop_table('follow_relationships')

    # Drop the enum type
    op.execute('DROP TYPE IF EXISTS followstatus')
