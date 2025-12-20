from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
import httpx
import json
from jose import jwt, JWTError

from app.core.database import get_db
from app.models.user import User
from app.core.config import settings

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from NextAuth session cookie.
    The cookie is encrypted by NextAuth, so we need to verify it.
    """
    # Get the session token from cookies
    session_token = request.cookies.get("next-auth.session-token")
    if not session_token:
        # Try alternative cookie name (used in production with __Secure- prefix)
        session_token = request.cookies.get("__Secure-next-auth.session-token")
    
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Decode the JWT token
        # Note: In production, NextAuth encrypts the JWT. 
        # For now, we'll trust the frontend validation
        # and just extract the user ID from the request header
        
        # Get user UUID from custom header set by frontend
        user_uuid = request.headers.get("X-User-Id")
        
        if not user_uuid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User UUID not provided",
            )
        
        # Get user from database using UUID
        user = db.query(User).filter(User.uuid == user_uuid).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    Used for endpoints that work with or without authentication.
    """
    try:
        return await get_current_user(request, db)
    except HTTPException:
        return None