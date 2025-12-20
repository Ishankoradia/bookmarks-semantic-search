import asyncio
from typing import Dict
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.job import Job, JobType
from app.models.bookmark import Bookmark
from app.services.job_service import job_service
from app.services.embedding import EmbeddingService
from app.core.logging import get_logger

class CategoryRefreshService:
    """Service for refreshing bookmark categories asynchronously."""
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.logger = get_logger(__name__)
    
    async def start_category_refresh(
        self, 
        db: Session, 
        category: str
    ) -> Job:
        """Start async category refresh job."""
        
        # Get bookmarks for the category
        if category == "Others":
            bookmarks_count = db.query(Bookmark).filter(
                (Bookmark.category.is_(None)) | (Bookmark.category == "")
            ).count()
        else:
            bookmarks_count = db.query(Bookmark).filter(
                Bookmark.category == category
            ).count()
        
        # Create job record
        job = job_service.create_job(
            db=db,
            job_type=JobType.REFRESH_CATEGORY,
            title=f"Refresh '{category}' Category ({bookmarks_count} bookmarks)",
            parameters={"category": category},
            total_items=bookmarks_count
        )
        
        # Start async processing in background
        asyncio.create_task(self._process_category_refresh(job.id, category))
        
        return job
    
    async def _process_category_refresh(
        self, 
        job_id: UUID, 
        category: str
    ):
        """Background processing logic for category refresh."""
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        
        try:
            # Mark job as started
            job_service.mark_started(db, job_id)
            
            # Get bookmarks for the category
            if category == "Others":
                bookmarks = db.query(Bookmark).filter(
                    (Bookmark.category.is_(None)) | (Bookmark.category == "")
                ).all()
            else:
                bookmarks = db.query(Bookmark).filter(
                    Bookmark.category == category
                ).all()
            
            total = len(bookmarks)
            migration_results = {"moved": {}, "failed": [], "unchanged": 0}
            
            for i, bookmark in enumerate(bookmarks):
                try:
                    # Update progress
                    job_service.update_progress(
                        db=db,
                        job_id=job_id,
                        current=i + 1,
                        total=total,
                        current_item=f"Processing: {bookmark.title[:100]}"
                    )
                    
                    # Generate new category using AI
                    new_category = await self.embedding_service.generate_content_category(
                        title=bookmark.title,
                        content=bookmark.content or ""
                    )
                    
                    # Update if category changed
                    old_category = bookmark.category or "Others"
                    if new_category != old_category:
                        bookmark.category = new_category
                        
                        # Track migration
                        if new_category not in migration_results["moved"]:
                            migration_results["moved"][new_category] = {
                                "count": 0,
                                "bookmarks": []
                            }
                        
                        migration_results["moved"][new_category]["count"] += 1
                        migration_results["moved"][new_category]["bookmarks"].append({
                            "id": str(bookmark.id),
                            "title": bookmark.title,
                            "old_category": old_category
                        })
                    else:
                        migration_results["unchanged"] += 1
                    
                    # Commit changes for this bookmark
                    db.commit()
                    
                    # Small delay to avoid overwhelming the AI API
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    self.logger.error(f"Error processing bookmark {bookmark.id}: {e}", exc_info=True)
                    migration_results["failed"].append({
                        "id": str(bookmark.id),
                        "title": bookmark.title,
                        "error": str(e)
                    })
                    # Continue with next bookmark
            
            # Mark job as completed
            job_service.mark_completed(db, job_id, migration_results)
            
        except Exception as e:
            self.logger.error(f"Fatal error in category refresh job {job_id}: {e}", exc_info=True)
            job_service.mark_failed(db, job_id, str(e))
            
        finally:
            db.close()

# Create singleton instance
category_refresh_service = CategoryRefreshService()