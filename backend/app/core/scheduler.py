"""
Background Scheduler for Feed Refresh

Uses APScheduler to periodically refresh user feeds.
"""
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.config import settings
from app.core.logging import get_logger
from app.models.user_preference import UserPreference
from app.services.feed_service import FeedService

logger = get_logger(__name__)

scheduler = AsyncIOScheduler()
feed_service = FeedService()


async def refresh_all_user_feeds():
    """
    Background job to refresh feeds for all users with interests.

    This runs at the configured interval (default: every 24 hours).
    """
    logger.info("Starting scheduled feed refresh for all users")

    db: Session = SessionLocal()
    try:
        # Get all users with interests
        preferences = db.query(UserPreference).filter(
            UserPreference.interests != None,
            UserPreference.interests != []
        ).all()

        if not preferences:
            logger.info("No users with interests found, skipping feed refresh")
            return

        logger.info(f"Found {len(preferences)} users with interests")

        for pref in preferences:
            try:
                result = await feed_service.refresh_user_feed(
                    db=db,
                    user_id=pref.user_id,
                    interests=pref.interests,
                )
                logger.info(
                    f"Refreshed feed for user {pref.user_id}: "
                    f"fetched={result['articles_fetched']}, new={result['articles_new']}"
                )

                # Small delay between users to avoid overwhelming sources
                await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"Error refreshing feed for user {pref.user_id}: {e}")
                continue

        logger.info("Completed scheduled feed refresh for all users")

    except Exception as e:
        logger.error(f"Error in scheduled feed refresh: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler."""
    if scheduler.running:
        logger.info("Scheduler already running")
        return

    # Add feed refresh job
    scheduler.add_job(
        refresh_all_user_feeds,
        trigger=IntervalTrigger(hours=settings.FEED_REFRESH_INTERVAL_HOURS),
        id="refresh_feeds",
        name="Refresh user feeds",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        f"Scheduler started. Feed refresh scheduled every "
        f"{settings.FEED_REFRESH_INTERVAL_HOURS} hours"
    )


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
