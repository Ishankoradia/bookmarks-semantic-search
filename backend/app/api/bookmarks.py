from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.schemas.bookmark import (
    BookmarkCreate, BookmarkResponse, BookmarkUpdate, 
    BookmarkSearchResult, SearchQuery, ReadStatusUpdate,
    TagPreviewRequest, TagPreviewResponse, ParsedSearchQuery
)
from app.services.scraper import WebScraper
from app.services.embedding import EmbeddingService
from app.services.bookmark_service import BookmarkService

router = APIRouter()
bookmark_service = BookmarkService()
scraper = WebScraper()
embedding_service = EmbeddingService()

@router.post("/", response_model=BookmarkResponse)
async def create_bookmark(
    bookmark: BookmarkCreate,
    db: Session = Depends(get_db)
):
    try:
        result = await bookmark_service.create_bookmark(db, bookmark)
        return result
    except ValueError as e:
        error_msg = str(e)
        if "already exists" in error_msg.lower():
            raise HTTPException(status_code=400, detail="A bookmark with this URL already exists")
        elif "invalid url" in error_msg.lower():
            raise HTTPException(status_code=422, detail="Please provide a valid URL")
        else:
            raise HTTPException(status_code=400, detail=error_msg)
    except ConnectionError:
        raise HTTPException(status_code=400, detail="Unable to access the provided URL. Please check the URL and try again.")
    except TimeoutError:
        raise HTTPException(status_code=400, detail="The website took too long to respond. Please try again later.")
    except Exception as e:
        print(f"Unexpected error creating bookmark: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while creating the bookmark. Please try again.")

@router.get("/", response_model=List[BookmarkResponse])
def get_bookmarks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return bookmark_service.get_bookmarks(db, skip=skip, limit=limit)

@router.get("/{bookmark_id}", response_model=BookmarkResponse)
def get_bookmark(
    bookmark_id: UUID,
    db: Session = Depends(get_db)
):
    bookmark = bookmark_service.get_bookmark(db, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark

@router.put("/{bookmark_id}", response_model=BookmarkResponse)
def update_bookmark(
    bookmark_id: UUID,
    bookmark_update: BookmarkUpdate,
    db: Session = Depends(get_db)
):
    bookmark = bookmark_service.update_bookmark(db, bookmark_id, bookmark_update)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark

@router.delete("/{bookmark_id}")
def delete_bookmark(
    bookmark_id: UUID,
    db: Session = Depends(get_db)
):
    if not bookmark_service.delete_bookmark(db, bookmark_id):
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"message": "Bookmark deleted successfully"}

@router.post("/search", response_model=List[BookmarkSearchResult])
async def search_bookmarks(
    search: SearchQuery,
    db: Session = Depends(get_db)
):
    try:
        results = await bookmark_service.search_bookmarks_with_filters(
            db,
            query=search.query,
            limit=search.limit,
            threshold=search.threshold,
            filters=search.filters,
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

@router.patch("/{bookmark_id}/read-status", response_model=BookmarkResponse)
def update_read_status(
    bookmark_id: UUID,
    read_status: ReadStatusUpdate,
    db: Session = Depends(get_db)
):
    bookmark_update = BookmarkUpdate(is_read=read_status.is_read)
    bookmark = bookmark_service.update_bookmark(db, bookmark_id, bookmark_update)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark

@router.post("/preview-tags", response_model=TagPreviewResponse)
async def preview_tags(request: TagPreviewRequest):
    """Preview auto-generated tags for a URL before saving the bookmark."""
    try:
        url = str(request.url)
        
        # Scrape the URL to get content
        scraped_data = await scraper.scrape_url(url)
        
        if not scraped_data.get('title'):
            raise HTTPException(status_code=400, detail="Unable to extract content from this URL")
        
        # Generate tags using GPT-4o mini
        try:
            tags = await embedding_service.generate_content_tags(
                title=scraped_data['title'],
                description=scraped_data.get('description', ''),
                content=scraped_data['content'],
                domain=scraped_data['domain']
            )
        except Exception as e:
            print(f"Failed to generate tags: {e}")
            tags = []
        
        return TagPreviewResponse(
            tags=tags,
            title=scraped_data['title'],
            description=scraped_data.get('description'),
            domain=scraped_data['domain']
        )
        
    except ConnectionError:
        raise HTTPException(status_code=400, detail="Unable to access the provided URL")
    except TimeoutError:
        raise HTTPException(status_code=400, detail="The website took too long to respond")
    except Exception as e:
        print(f"Error in preview_tags: {e}")
        raise HTTPException(status_code=500, detail="Failed to preview tags")

@router.post("/{bookmark_id}/regenerate-tags")
async def regenerate_tags_for_bookmark(
    bookmark_id: UUID,
    db: Session = Depends(get_db)
):
    """Regenerate tags for an existing bookmark using AI."""
    bookmark = bookmark_service.get_bookmark(db, bookmark_id)
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
        print(f"Failed to regenerate tags for bookmark {bookmark_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to regenerate tags")