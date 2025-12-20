from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.logging import get_logger
from app.services.job_service import job_service
from app.services.category_refresh_service import category_refresh_service
from app.models.job import JobType

router = APIRouter()
logger = get_logger(__name__)

@router.post("/categories/{category}/refresh")
async def refresh_category(
    category: str,
    db: Session = Depends(get_db)
):
    """Start a category refresh job."""
    try:
        # Check if there's already an active refresh for this category
        active_jobs = job_service.get_active_jobs(db, JobType.REFRESH_CATEGORY)
        for job in active_jobs:
            if job.parameters.get("category") == category:
                return {
                    "job_id": str(job.id),
                    "status": "already_running",
                    "message": f"A refresh is already in progress for '{category}'"
                }
        
        # Start new refresh job
        job = await category_refresh_service.start_category_refresh(db, category)
        
        return {
            "job_id": str(job.id),
            "status": "started",
            "total_bookmarks": job.progress_total
        }
        
    except Exception as e:
        logger.error(f"Error starting category refresh: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
def get_job_status(
    job_id: UUID,
    db: Session = Depends(get_db)
):
    """Get job status and progress."""
    job = job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job.to_dict()

@router.get("/jobs/active")
def get_active_jobs(
    db: Session = Depends(get_db)
):
    """Get all active jobs for progress restoration."""
    jobs = job_service.get_active_jobs(db)
    return [job.to_dict() for job in jobs]

@router.delete("/jobs/{job_id}")
def cancel_job(
    job_id: UUID,
    db: Session = Depends(get_db)
):
    """Cancel a running job."""
    job = job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.is_finished:
        return {"message": "Job has already finished"}
    
    job.mark_cancelled()
    db.commit()
    
    return {"message": "Job cancelled successfully"}