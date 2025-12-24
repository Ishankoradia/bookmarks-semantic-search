from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from app.core.config import settings

def get_jwt_secret() -> str:
    """Get JWT secret key, fallback to SECRET_KEY if JWT_SECRET_KEY not set."""
    return settings.JWT_SECRET_KEY or settings.SECRET_KEY

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing the data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token as string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRATION_DAYS)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        get_jwt_secret(), 
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string to verify
        
    Returns:
        Decoded token payload if valid, None if invalid
    """
    try:
        payload = jwt.decode(
            token, 
            get_jwt_secret(), 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None

def create_user_token(user_uuid: str, user_email: str) -> str:
    """
    Create a JWT token for a user.
    
    Args:
        user_uuid: User's UUID from database
        user_email: User's email address
        
    Returns:
        Encoded JWT token
    """
    token_data = {
        "sub": user_uuid,  # Subject - the user UUID
        "email": user_email,
        "iat": datetime.now(timezone.utc),
    }
    
    return create_access_token(token_data)