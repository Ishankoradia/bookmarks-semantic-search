"""
Feed API Endpoints

Manages the user's Explore feed - fetching articles,
saving to bookmarks, and marking as not interested.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional

from app.core.database import get_db, SessionLocal
from app.core.auth import get_current_user
from app.core.logging import get_logger
from app.models.user import User
from app.models.user_preference import UserPreference
from app.models.job import Job, JobType, JobStatus
from app.services.feed_service import FeedService
from app.services.bookmark_service import BookmarkService
from app.services.follow_service import follow_service
from app.schemas.feed_article import (
    FeedArticleResponse,
    FeedArticleListResponse,
    FeedRefreshResponse,
)
from app.schemas.bookmark import BookmarkResponse
from app.schemas.follow import FriendsFeedResponse

logger = get_logger(__name__)
router = APIRouter()
feed_service = FeedService()
bookmark_service = BookmarkService()


def _run_feed_refresh_job(job_id: str, user_id: int, interests: list):
    """Background task to refresh feed for a user with job tracking."""
    # Create a new event loop for the background thread
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    db = SessionLocal()
    try:
        # Get the job and mark as started
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        job.mark_started()
        db.commit()

        # Run the feed refresh
        result = loop.run_until_complete(
            feed_service.refresh_user_feed(
                db=db,
                user_id=user_id,
                interests=interests,
            )
        )

        # Mark job as completed
        job.mark_completed(result=result)
        db.commit()

        logger.info(f"Feed refresh job {job_id} completed for user {user_id}")

    except Exception as e:
        logger.error(f"Feed refresh job {job_id} failed: {e}")
        # Mark job as failed
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.mark_failed(str(e))
            db.commit()
    finally:
        db.close()
        loop.close()


@router.get("/friends", response_model=FriendsFeedResponse)
async def get_friends_feed(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get bookmarks from users you follow.

    Returns paginated list of bookmarks from all followed users,
    sorted by most recent first.
    """
    return await follow_service.get_friends_feed(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )


@router.get("", response_model=FeedArticleListResponse)
async def get_feed(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user's Explore feed articles.

    Returns paginated list of articles based on user's interests.
    Articles marked as "not interested" appear at the bottom.
    """
    articles = feed_service.get_user_feed(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )

    total = feed_service.get_feed_count(
        db=db,
        user_id=current_user.id,
    )

    has_more = (skip + limit) < total

    return FeedArticleListResponse(
        articles=articles,
        total=total,
        has_more=has_more,
    )


@router.post("/refresh")
async def refresh_feed(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger a feed refresh based on user's interests.

    This runs in the background. Returns a job object to track progress.
    Poll GET /feed/refresh/status to check if refresh is complete.
    """
    # Get user's interests
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()

    if not preferences or not preferences.interests:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select your interests first before refreshing the feed"
        )

    # Check if there's already a running feed refresh job for this user
    existing_job = db.query(Job).filter(
        and_(
            Job.job_type == JobType.REFRESH_FEED.value,
            Job.status.in_([JobStatus.PENDING.value, JobStatus.RUNNING.value]),
        )
    ).all()

    # Filter by user_id in Python since JSON querying varies by DB
    existing_job = next(
        (j for j in existing_job if j.parameters.get("user_id") == current_user.id),
        None
    )

    if existing_job:
        # Return existing job info
        return existing_job.to_dict()

    # Create a new job
    job = Job(
        job_type=JobType.REFRESH_FEED.value,
        title=f"Refreshing feed for {', '.join(preferences.interests[:3])}{'...' if len(preferences.interests) > 3 else ''}",
        parameters={"user_id": current_user.id, "interests": preferences.interests},
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Start background task
    background_tasks.add_task(
        _run_feed_refresh_job,
        str(job.id),
        current_user.id,
        preferences.interests,
    )

    logger.info(f"Started feed refresh job {job.id} for user {current_user.id}")

    return job.to_dict()


@router.get("/refresh/status")
async def get_refresh_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the status of the current/latest feed refresh job.

    Returns the most recent feed refresh job for this user.
    """
    jobs = db.query(Job).filter(
        Job.job_type == JobType.REFRESH_FEED.value,
    ).order_by(Job.created_at.desc()).limit(20).all()

    # Filter by user_id in Python
    job = next(
        (j for j in jobs if j.parameters.get("user_id") == current_user.id),
        None
    )

    if not job:
        return {"status": "none", "message": "No feed refresh job found"}

    return job.to_dict()


@router.post("/{article_id}/save", response_model=BookmarkResponse)
async def save_article_to_bookmarks(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save a feed article to user's bookmarks.

    This creates a new bookmark from the feed article and marks
    the article as saved in the feed.
    """
    # Get the feed article
    article = feed_service.get_article(
        db=db,
        user_id=current_user.id,
        article_id=article_id,
    )

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )

    if article.is_saved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Article already saved to bookmarks"
        )

    try:
        # Create bookmark from the article
        bookmark = await bookmark_service.create_bookmark(
            db=db,
            url=article.url,
            user_id=current_user.id,
        )

        # Mark the feed article as saved
        feed_service.mark_saved(
            db=db,
            user_id=current_user.id,
            article_id=article_id,
        )

        logger.info(f"User {current_user.id} saved article {article_id} to bookmarks")
        return bookmark

    except ValueError as e:
        # Handle duplicate bookmark or other validation errors
        error_msg = str(e)
        if "already exists" in error_msg.lower():
            # Bookmark already exists, just mark article as saved
            feed_service.mark_saved(
                db=db,
                user_id=current_user.id,
                article_id=article_id,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This URL is already in your bookmarks"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        logger.error(f"Error saving article to bookmarks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save article to bookmarks"
        )


@router.post("/{article_id}/not-interested", response_model=FeedArticleResponse)
async def mark_not_interested(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a feed article as "not interested".

    The article will be hidden from the user's feed but not deleted,
    allowing us to avoid showing similar content in the future.
    """
    article = feed_service.mark_not_interested(
        db=db,
        user_id=current_user.id,
        article_id=article_id,
    )

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )

    logger.info(f"User {current_user.id} marked article {article_id} as not interested")
    return article


@router.get("/{article_id}", response_model=FeedArticleResponse)
async def get_article(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific feed article by ID."""
    article = feed_service.get_article(
        db=db,
        user_id=current_user.id,
        article_id=article_id,
    )

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )

    return article
