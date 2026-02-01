from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import engine, Base
from app.core.logging import setup_logging
from app.core.scheduler import start_scheduler, stop_scheduler
from app.api import bookmarks, jobs, auth, preferences, feed, follows

# Initialize logging
logger = setup_logging()
logger.info("Initializing bookmark backend application")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    bookmarks.router,
    prefix=f"{settings.API_V1_STR}/bookmarks",
    tags=["bookmarks"]
)

app.include_router(
    jobs.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["jobs"]
)

app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_STR}/auth",
    tags=["auth"]
)

app.include_router(
    preferences.router,
    prefix=f"{settings.API_V1_STR}/preferences",
    tags=["preferences"]
)

app.include_router(
    feed.router,
    prefix=f"{settings.API_V1_STR}/feed",
    tags=["feed"]
)

app.include_router(
    follows.router,
    prefix=f"{settings.API_V1_STR}/follows",
    tags=["follows"]
)

@app.on_event("startup")
async def startup_event():
    logger.info(f"FastAPI application started successfully on {settings.PROJECT_NAME} v{settings.VERSION}")
    # Start background scheduler for feed refresh
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application")
    stop_scheduler()

@app.get("/")
def read_root():
    return {"name": settings.PROJECT_NAME, "version": settings.VERSION}

@app.get("/health")
def health_check():
    return {"status": "healthy"}