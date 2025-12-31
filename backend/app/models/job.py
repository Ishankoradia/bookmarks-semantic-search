from sqlalchemy import Column, String, Integer, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from datetime import datetime, timedelta
import uuid
import enum

class JobStatus(str, enum.Enum):
    """Job execution status."""
    PENDING = "pending"        # Job created, waiting to start
    RUNNING = "running"        # Currently executing
    COMPLETED = "completed"    # Successfully finished
    FAILED = "failed"         # Failed with error
    CANCELLED = "cancelled"   # Manually cancelled

class JobType(str, enum.Enum):
    """Types of background jobs."""
    REFRESH_CATEGORY = "refresh_category"  # Refresh bookmarks in a category
    REFRESH_FEED = "refresh_feed"          # Refresh user's explore feed

class Job(Base):
    """Generic job tracking table for all background operations."""
    __tablename__ = "jobs"

    # Core job identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type = Column(String(50), nullable=False, index=True)
    status = Column(String(20), nullable=False, default=JobStatus.PENDING.value, index=True)
    
    # Human readable info
    title = Column(String(200), nullable=False)  # "Refresh 'Others' Category"
    
    # Progress tracking
    progress_current = Column(Integer, default=0)     # Current progress (e.g., 5)
    progress_total = Column(Integer, default=0)       # Total items (e.g., 30)
    progress_percentage = Column(Integer, default=0)   # Calculated percentage (0-100)
    current_item = Column(String(500))                # Current item being processed
    
    # Job parameters and results
    parameters = Column(JSON, default={})        # Job-specific input parameters
    result = Column(JSON)                        # Job output/results
    error_message = Column(Text)                 # Error details if failed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime)                # When job actually started running
    completed_at = Column(DateTime)             # When job finished (success/failure)
    expires_at = Column(DateTime, nullable=False)  # Auto-cleanup time

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set default expiration to 24 hours from creation
        if not self.expires_at:
            self.expires_at = datetime.utcnow() + timedelta(hours=24)
    
    @property
    def is_active(self) -> bool:
        """Check if job is currently running or pending."""
        return self.status in [JobStatus.PENDING.value, JobStatus.RUNNING.value]
    
    @property
    def is_finished(self) -> bool:
        """Check if job has finished (success, failure, or cancellation)."""
        return self.status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value, JobStatus.CANCELLED.value]
    
    @property
    def duration_seconds(self) -> float:
        """Get job duration in seconds (if started)."""
        if not self.started_at:
            return 0.0
        end_time = self.completed_at or datetime.utcnow()
        return (end_time - self.started_at).total_seconds()
    
    def update_progress(self, current: int, total: int = None, current_item: str = None):
        """Update job progress with automatic percentage calculation."""
        self.progress_current = current
        if total is not None:
            self.progress_total = total
        if current_item is not None:
            self.current_item = current_item
        
        # Calculate percentage
        if self.progress_total > 0:
            self.progress_percentage = min(100, int((self.progress_current / self.progress_total) * 100))
        else:
            self.progress_percentage = 0
    
    def mark_started(self):
        """Mark job as started."""
        self.status = JobStatus.RUNNING.value
        self.started_at = datetime.utcnow()
    
    def mark_completed(self, result: dict = None):
        """Mark job as successfully completed."""
        self.status = JobStatus.COMPLETED.value
        self.completed_at = datetime.utcnow()
        self.progress_percentage = 100
        if result:
            self.result = result
    
    def mark_failed(self, error_message: str):
        """Mark job as failed with error message."""
        self.status = JobStatus.FAILED.value
        self.completed_at = datetime.utcnow()
        self.error_message = error_message
    
    def mark_cancelled(self):
        """Mark job as cancelled."""
        self.status = JobStatus.CANCELLED.value
        self.completed_at = datetime.utcnow()

    def to_dict(self) -> dict:
        """Convert job to dictionary for API responses."""
        return {
            "id": str(self.id),
            "job_type": self.job_type,
            "status": self.status,
            "title": self.title,
            "progress_current": self.progress_current,
            "progress_total": self.progress_total,
            "progress_percentage": self.progress_percentage,
            "current_item": self.current_item,
            "parameters": self.parameters,
            "result": self.result,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self.duration_seconds
        }