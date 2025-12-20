from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.core.logging import setup_logging
from app.api import bookmarks, jobs, auth

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

@app.on_event("startup")
async def startup_event():
    logger.info(f"FastAPI application started successfully on {settings.PROJECT_NAME} v{settings.VERSION}")

@app.get("/")
def read_root():
    return {"name": settings.PROJECT_NAME, "version": settings.VERSION}

@app.get("/health")
def health_check():
    return {"status": "healthy"}