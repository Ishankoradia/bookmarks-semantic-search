from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.user_preference import (
    UserPreferenceResponse,
    UserPreferenceUpdate,
    TopicsListResponse,
    AVAILABLE_TOPICS,
)

router = APIRouter()


@router.get("", response_model=UserPreferenceResponse)
async def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's preferences."""
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()

    if not preferences:
        # Create default preferences for the user
        preferences = UserPreference(
            user_id=current_user.id,
            interests=[],
            is_discoverable=True
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)

    return preferences


@router.put("", response_model=UserPreferenceResponse)
async def update_preferences(
    preferences_update: UserPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's preferences."""
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()

    if not preferences:
        # Create new preferences
        preferences = UserPreference(
            user_id=current_user.id,
            interests=preferences_update.interests or [],
            is_discoverable=preferences_update.is_discoverable if preferences_update.is_discoverable is not None else True
        )
        db.add(preferences)
    else:
        # Update existing preferences
        if preferences_update.interests is not None:
            # Validate that all interests are valid topics
            invalid_topics = [t for t in preferences_update.interests if t not in AVAILABLE_TOPICS]
            if invalid_topics:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid topics: {invalid_topics}. Valid topics are: {AVAILABLE_TOPICS}"
                )
            preferences.interests = preferences_update.interests

        if preferences_update.is_discoverable is not None:
            preferences.is_discoverable = preferences_update.is_discoverable

    db.commit()
    db.refresh(preferences)
    return preferences


@router.get("/topics", response_model=TopicsListResponse)
async def get_available_topics():
    """Get list of available topics for user interests."""
    return TopicsListResponse(topics=AVAILABLE_TOPICS)
