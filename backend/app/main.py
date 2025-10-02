from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api import bookmarks

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

@app.get("/")
def read_root():
    return {"name": settings.PROJECT_NAME, "version": settings.VERSION}

@app.get("/health")
def health_check():
    return {"status": "healthy"}