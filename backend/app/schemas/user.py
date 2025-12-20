from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    google_id: str

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None

class UserResponse(UserBase):
    id: int
    uuid: uuid.UUID
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True