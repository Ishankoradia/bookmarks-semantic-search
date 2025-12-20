from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.core.config import settings

router = APIRouter()

def get_whitelisted_emails() -> list[str]:
    """Get list of whitelisted emails from environment variable."""
    emails = settings.WHITELISTED_EMAILS if hasattr(settings, 'WHITELISTED_EMAILS') else ""
    if not emails:
        return []
    return [email.strip().lower() for email in emails.split(",") if email.strip()]

def is_email_whitelisted(email: str) -> bool:
    """Check if an email is in the whitelist."""
    whitelisted = get_whitelisted_emails()
    # If no whitelist is configured, allow all
    if not whitelisted:
        return True
    return email.lower() in whitelisted

@router.post("/user", response_model=UserResponse)
async def create_or_update_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Create or update a user from Google OAuth.
    This endpoint is called by NextAuth after successful Google authentication.
    """
    # Check if email is whitelisted
    if not is_email_whitelisted(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not whitelisted"
        )
    
    # Check if user exists by email or google_id
    existing_user = db.query(User).filter(
        or_(User.email == user_data.email, User.google_id == user_data.google_id)
    ).first()
    
    if existing_user:
        # Update existing user
        existing_user.name = user_data.name or existing_user.name
        existing_user.picture = user_data.picture or existing_user.picture
        existing_user.last_login = datetime.utcnow()
        
        # If user was found by email but google_id is different, update it
        if existing_user.google_id != user_data.google_id:
            existing_user.google_id = user_data.google_id
        
        db.commit()
        db.refresh(existing_user)
        return existing_user
    else:
        # Create new user
        new_user = User(
            email=user_data.email,
            name=user_data.name,
            picture=user_data.picture,
            google_id=user_data.google_id,
            last_login=datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

@router.get("/user/{user_uuid}", response_model=UserResponse)
async def get_user(
    user_uuid: str,
    db: Session = Depends(get_db)
):
    """Get a user by UUID."""
    user = db.query(User).filter(User.uuid == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.get("/whitelist")
async def get_whitelist():
    """Get the list of whitelisted emails (for admin purposes)."""
    return {"whitelisted_emails": get_whitelisted_emails()}