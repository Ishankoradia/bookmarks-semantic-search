from pydantic_settings import BaseSettings
from typing import List
from enum import Enum


class SearchMode(str, Enum):
    SEMANTIC = "semantic"
    FULLTEXT = "fulltext"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Bookmark Semantic Search"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str
    OPENAI_API_KEY: str
    SECRET_KEY: str
    ENVIRONMENT: str = "development"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3002"

    # Authentication
    WHITELISTED_EMAILS: str = ""  # Comma-separated list of whitelisted emails

    # JWT Configuration
    JWT_SECRET_KEY: str = ""  # Will use SECRET_KEY if not set
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_DAYS: int = 30  # Token expiration in days

    # Embedding model configuration
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    # AI model configurations for different use cases
    # Tag generation model - Fast and cheap for quick tag generation
    TAG_GENERATION_MODEL: str = "gpt-4o-mini"
    TAG_GENERATION_TEMPERATURE: float = 0.3

    # Category generation model - Accurate categorization
    CATEGORY_GENERATION_MODEL: str = "gpt-4o-mini"
    CATEGORY_GENERATION_TEMPERATURE: float = 0.1

    # Query parsing model - Understanding user intent
    QUERY_PARSING_MODEL: str = "gpt-4o-mini"
    QUERY_PARSING_TEMPERATURE: float = 0.2

    # Content analysis model - For future complex analysis
    CONTENT_ANALYSIS_MODEL: str = "gpt-4o-mini"
    CONTENT_ANALYSIS_TEMPERATURE: float = 0.5

    MAX_CONTENT_LENGTH: int = 50000

    # Search mode: "semantic" (AI embeddings) or "fulltext" (PostgreSQL FTS)
    SEARCH_MODE: SearchMode = SearchMode.FULLTEXT

    # Explore Feed Configuration
    FEED_REFRESH_INTERVAL_HOURS: int = 24  # How often to refresh feeds
    FEED_ARTICLES_PER_TOPIC: int = 10  # Max articles to fetch per topic
    FEED_MAX_ARTICLES_PER_USER: int = 100  # Max articles in user's feed
    FEED_ARTICLE_MAX_AGE_DAYS: int = 7  # Remove articles older than this

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
