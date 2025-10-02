from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Bookmark Semantic Search"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str
    OPENAI_API_KEY: str
    SECRET_KEY: str
    ENVIRONMENT: str = "development"
    
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3002"
    
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536
    
    MAX_CONTENT_LENGTH: int = 50000
    
    class Config:
        env_file = ".env"
        extra = "ignore"
        
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

settings = Settings()