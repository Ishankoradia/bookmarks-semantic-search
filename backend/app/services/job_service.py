from typing import List, Optional
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.models.job import Job, JobStatus, JobType

class JobService:
    """Service for managing background jobs."""
    
    def create_job(
        self, 
        db: Session,
        job_type: JobType,
        title: str,
        parameters: dict = None,
        total_items: int = 0
    ) -> Job:
        """Create a new job with pending status."""
        job = Job(
            job_type=job_type.value,
            status=JobStatus.PENDING.value,
            title=title,
            parameters=parameters or {},
            progress_total=total_items
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    
    def get_job(self, db: Session, job_id: UUID) -> Optional[Job]:
        """Get job by ID."""
        return db.query(Job).filter(Job.id == job_id).first()
    
    def get_active_jobs(
        self, 
        db: Session, 
        job_type: JobType = None
    ) -> List[Job]:
        """Get all running/pending jobs, optionally filtered by type."""
        query = db.query(Job).filter(
            Job.status.in_([JobStatus.PENDING.value, JobStatus.RUNNING.value])
        )
        
        if job_type:
            query = query.filter(Job.job_type == job_type.value)
        
        return query.all()
    
    def update_progress(
        self,
        db: Session,
        job_id: UUID,
        current: int,
        total: int = None,
        current_item: str = None
    ):
        """Update job progress."""
        job = self.get_job(db, job_id)
        if not job:
            return
        
        job.update_progress(current, total, current_item)
        db.commit()
    
    def mark_started(self, db: Session, job_id: UUID):
        """Mark job as started."""
        job = self.get_job(db, job_id)
        if not job:
            return
        
        job.mark_started()
        db.commit()
    
    def mark_completed(
        self,
        db: Session,
        job_id: UUID,
        result: dict = None
    ):
        """Mark job as completed with results."""
        job = self.get_job(db, job_id)
        if not job:
            return
        
        job.mark_completed(result)
        db.commit()
    
    def mark_failed(
        self,
        db: Session,
        job_id: UUID,
        error: str
    ):
        """Mark job as failed with error message."""
        job = self.get_job(db, job_id)
        if not job:
            return
        
        job.mark_failed(error)
        db.commit()
    
    def cleanup_expired_jobs(self, db: Session):
        """Delete expired jobs from database."""
        expired_jobs = db.query(Job).filter(
            Job.expires_at < datetime.utcnow()
        ).all()
        
        for job in expired_jobs:
            db.delete(job)
        
        db.commit()
        return len(expired_jobs)

# Create singleton instance
job_service = JobService()