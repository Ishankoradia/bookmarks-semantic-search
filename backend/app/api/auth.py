from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
from typing import Optional
import httpx

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.core.config import settings
from app.core.jwt import create_user_token
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

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

from pydantic import BaseModel

class LoginResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str

@router.post("/login", response_model=LoginResponse)
async def login(
    user_data: UserCreate,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Login endpoint that creates/updates user and issues JWT cookie.
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
        curr_user = existing_user
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
        curr_user = new_user
    
    # Create JWT token and return in response
    token = create_user_token(str(curr_user.uuid), curr_user.email)
    
    # Return user data with JWT token
    return {
        "user": curr_user,
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(response: Response):
    """
    Logout endpoint that clears the JWT cookie.
    """
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Successfully logged out"}

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


class GoogleExtensionAuth(BaseModel):
    access_token: str


@router.post("/google/extension", response_model=LoginResponse)
async def google_extension_auth(
    auth_data: GoogleExtensionAuth,
    db: Session = Depends(get_db)
):
    """
    Authenticate via Google access token from Chrome extension.

    The extension uses chrome.identity to get a Google access token,
    then exchanges it here for our app's JWT token.
    """
    try:
        # Verify the Google access token by fetching user info
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {auth_data.access_token}"}
            )

            if response.status_code != 200:
                logger.error(f"Google userinfo failed: {response.status_code} {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google access token"
                )

            google_user = response.json()
    except httpx.RequestError as e:
        logger.error(f"Error fetching Google user info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify Google token"
        )

    email = google_user.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not found in Google account"
        )

    # Check if email is whitelisted
    if not is_email_whitelisted(email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not whitelisted"
        )

    google_id = google_user.get("id")
    name = google_user.get("name")
    picture = google_user.get("picture")

    # Check if user exists by email or google_id
    existing_user = db.query(User).filter(
        or_(User.email == email, User.google_id == google_id)
    ).first()

    if existing_user:
        # Update existing user
        existing_user.name = name or existing_user.name
        existing_user.picture = picture or existing_user.picture
        existing_user.last_login = datetime.utcnow()

        if existing_user.google_id != google_id:
            existing_user.google_id = google_id

        db.commit()
        db.refresh(existing_user)
        curr_user = existing_user
    else:
        # Create new user
        new_user = User(
            email=email,
            name=name,
            picture=picture,
            google_id=google_id,
            last_login=datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        curr_user = new_user

    # Create JWT token
    token = create_user_token(str(curr_user.uuid), curr_user.email)

    logger.info(f"Chrome extension auth successful for user: {email}")

    return {
        "user": curr_user,
        "access_token": token,
        "token_type": "bearer"
    }