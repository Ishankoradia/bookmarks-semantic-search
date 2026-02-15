from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.logging import get_logger
from app.models.user import User
from app.schemas.bookmark import (
    BookmarkResponse, BookmarkUpdate,
    BookmarkSearchResult, SearchQuery, ReadStatusUpdate, ParsedSearchQuery,
    BookmarkPreviewRequest, BookmarkPreviewResponse, BookmarkSave
)
from app.services.embedding import EmbeddingService
from app.services.bookmark_service import BookmarkService

router = APIRouter()
bookmark_service = BookmarkService()
embedding_service = EmbeddingService()
logger = get_logger(__name__)


@router.post("/preview", response_model=BookmarkPreviewResponse)
async def preview_bookmark(
    request: BookmarkPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview a URL - scrapes content, generates embeddings/tags/category,
    and creates a pending bookmark. Returns preview data with bookmark ID.
    """
    try:
        result = await bookmark_service.preview_bookmark(db, str(request.url))
        bookmark = result['bookmark']
        scrape_failed = result['scrape_failed']
        return BookmarkPreviewResponse(
            id=bookmark.id,
            title=bookmark.title,
            description=bookmark.description,
            domain=bookmark.domain,
            suggested_category=bookmark.category or "General",
            tags=bookmark.tags or [],
            scrape_failed=scrape_failed
        )
    except ValueError as e:
        error_msg = str(e)
        if "invalid url" in error_msg.lower():
            raise HTTPException(status_code=422, detail="Please provide a valid URL")
        else:
            raise HTTPException(status_code=400, detail=error_msg)
    except ConnectionError:
        raise HTTPException(status_code=400, detail="Unable to access the provided URL. Please check the URL and try again.")
    except TimeoutError:
        raise HTTPException(status_code=400, detail="The website took too long to respond. Please try again later.")
    except Exception as e:
        logger.error(f"Unexpected error previewing bookmark: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


@router.post("/save", response_model=BookmarkResponse)
def save_bookmark(
    save_data: BookmarkSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save/claim a previewed bookmark. Sets the user_id and updates category/reference.
    """
    try:
        result = bookmark_service.save_bookmark(db, save_data, current_user.id)
        return result
    except ValueError as e:
        error_msg = str(e)
        if "already" in error_msg.lower():
            raise HTTPException(status_code=400, detail=error_msg)
        elif "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        logger.error(f"Unexpected error saving bookmark: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")

@router.get("/", response_model=List[BookmarkResponse])
def get_bookmarks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_read: Optional[bool] = Query(None, description="Filter by read status: true for read, false for unread, null for all"),
    categories: Optional[List[str]] = Query(None, description="Filter by categories (multiple allowed)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return bookmark_service.get_bookmarks(db, user_id=current_user.id, skip=skip, limit=limit, is_read=is_read, categories=categories)

@router.get("/categories", response_model=dict)
def get_categories(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all categories with their bookmark counts."""
    try:
        categories = bookmark_service.get_category_counts(db, user_id=current_user.id, is_read=is_read)
        return categories
    except Exception as e:
        logger.error(f"Error getting categories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get categories")

@router.get("/categories/list", response_model=List[str])
def get_category_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of all category names for filtering."""
    try:
        grouped_bookmarks = bookmark_service.get_bookmarks_grouped_by_category(db, user_id=current_user.id)
        return sorted(list(grouped_bookmarks.keys()))
    except Exception as e:
        logger.error(f"Error getting category list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get category list")

@router.post("/search", response_model=List[BookmarkSearchResult])
async def search_bookmarks(
    search: SearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        results = await bookmark_service.search_bookmarks_with_filters(
            db,
            query=search.query,
            limit=search.limit,
            threshold=search.threshold,
            filters=search.filters,
            user_id=current_user.id,
            auto_parse_query=True  # Will parse query if no filters provided
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parse-query", response_model=ParsedSearchQuery)
async def parse_search_query(query: str):
    """
    Parse a natural language search query to extract semantic search text and metadata filters.
    Useful for testing the query parsing logic.
    """
    try:
        parsed = await embedding_service.parse_search_query(query)
        return ParsedSearchQuery(**parsed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{bookmark_id}", response_model=BookmarkResponse)
def get_bookmark(
    bookmark_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookmark = bookmark_service.get_bookmark(db, bookmark_id, user_id=current_user.id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark

@router.put("/{bookmark_id}", response_model=BookmarkResponse)
def update_bookmark(
    bookmark_id: UUID,
    bookmark_update: BookmarkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookmark = bookmark_service.update_bookmark(db, bookmark_id, bookmark_update, user_id=current_user.id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark

@router.delete("/{bookmark_id}")
def delete_bookmark(
    bookmark_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not bookmark_service.delete_bookmark(db, bookmark_id, user_id=current_user.id):
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"message": "Bookmark deleted successfully"}

@router.patch("/{bookmark_id}/read-status", response_model=BookmarkResponse)
def update_read_status(
    bookmark_id: UUID,
    read_status: ReadStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookmark_update = BookmarkUpdate(is_read=read_status.is_read)
    bookmark = bookmark_service.update_bookmark(db, bookmark_id, bookmark_update, user_id=current_user.id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark

@router.post("/{bookmark_id}/regenerate-tags")
async def regenerate_tags_for_bookmark(
    bookmark_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenerate tags for an existing bookmark using AI."""
    bookmark = bookmark_service.get_bookmark(db, bookmark_id, user_id=current_user.id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    try:
        # Generate new tags using existing content
        tags = await embedding_service.generate_content_tags(
            title=bookmark.title,
            description=bookmark.description or '',
            content=bookmark.content or '',
            domain=bookmark.domain
        )
        
        # Update bookmark with new tags
        bookmark.tags = tags
        db.commit()
        db.refresh(bookmark)
        
        return {
            "tags": bookmark.tags,
            "title": bookmark.title,
            "description": bookmark.description,
            "domain": bookmark.domain
        }
        
    except Exception as e:
        logger.error(f"Failed to regenerate tags for bookmark {bookmark_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to regenerate tags")