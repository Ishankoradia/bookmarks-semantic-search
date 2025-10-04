from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.bookmark import Bookmark
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate, BookmarkSearchResult
from app.services.scraper import WebScraper
from app.services.embedding import EmbeddingService
import uuid

class BookmarkService:
    def __init__(self):
        self.scraper = WebScraper()
        self.embedding_service = EmbeddingService()
    
    async def create_bookmark(self, db: Session, bookmark_data: BookmarkCreate) -> Bookmark:
        url = str(bookmark_data.url)
        
        # Check if bookmark already exists
        existing = db.query(Bookmark).filter(Bookmark.url == url).first()
        if existing:
            raise ValueError("A bookmark with this URL already exists")
        
        try:
            # Scrape the URL
            scraped_data = await self.scraper.scrape_url(url)
            
            if not scraped_data.get('title'):
                raise ValueError("Unable to extract content from this URL. Please check if the URL is accessible.")
            
        except Exception as e:
            if "Invalid URL" in str(e):
                raise ValueError("Please provide a valid URL")
            elif "timeout" in str(e).lower():
                raise TimeoutError("The website took too long to respond")
            elif "connection" in str(e).lower():
                raise ConnectionError("Unable to connect to the website")
            else:
                raise ValueError(f"Failed to process URL: {str(e)}")
        
        try:
            # Create embedding - include reference in the embedding if provided
            reference_text = f" Reference: {bookmark_data.reference}" if bookmark_data.reference else ""
            content_for_embedding = f"{scraped_data['title']} {scraped_data.get('description', '')} {scraped_data['content']}{reference_text}"
            embedding = await self.embedding_service.create_embedding(content_for_embedding)
            
        except Exception as e:
            raise ValueError("Failed to create content embeddings. Please try again.")
        
        try:
            # Generate auto-tags using GPT-4o mini
            auto_tags = await self.embedding_service.generate_content_tags(
                title=scraped_data['title'],
                description=scraped_data.get('description', ''),
                content=scraped_data['content'],
                domain=scraped_data['domain']
            )
            
        except Exception as e:
            print(f"Failed to generate auto-tags: {e}")
            # Continue without tags if auto-tagging fails
            auto_tags = []
        
        try:
            # Create bookmark with auto-generated tags
            bookmark = Bookmark(
                url=url,
                title=scraped_data['title'],
                description=scraped_data.get('description'),
                content=scraped_data['content'],
                raw_html=scraped_data['raw_html'],
                domain=scraped_data['domain'],
                embedding=embedding,
                tags=auto_tags,  # Use auto-generated tags
                meta_data=scraped_data['metadata'],
                reference=bookmark_data.reference if hasattr(bookmark_data, 'reference') else None
            )
            
            db.add(bookmark)
            db.commit()
            db.refresh(bookmark)
            
            return bookmark
            
        except Exception as e:
            db.rollback()
            raise ValueError("Failed to save bookmark to database. Please try again.")
    
    def get_bookmark(self, db: Session, bookmark_id: uuid.UUID) -> Optional[Bookmark]:
        return db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    
    def get_bookmarks(self, db: Session, skip: int = 0, limit: int = 100) -> List[Bookmark]:
        return db.query(Bookmark).offset(skip).limit(limit).all()
    
    def update_bookmark(self, db: Session, bookmark_id: uuid.UUID, update_data: BookmarkUpdate) -> Optional[Bookmark]:
        bookmark = self.get_bookmark(db, bookmark_id)
        if not bookmark:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(bookmark, field, value)
        
        db.commit()
        db.refresh(bookmark)
        return bookmark
    
    def delete_bookmark(self, db: Session, bookmark_id: uuid.UUID) -> bool:
        bookmark = self.get_bookmark(db, bookmark_id)
        if not bookmark:
            return False
        
        db.delete(bookmark)
        db.commit()
        return True
    
    async def search_bookmarks(
        self, 
        db: Session, 
        query: str, 
        limit: int = 10,
        threshold: float = 0.5
    ) -> List[BookmarkSearchResult]:
        query_embedding = await self.embedding_service.create_embedding(query)
        
        sql_query = text("""
            SELECT 
                id, url, title, description, content, domain, tags, meta_data,
                is_read, reference, created_at, updated_at,
                1 - (embedding <=> CAST(:embedding AS vector)) AS similarity_score
            FROM bookmarks
            WHERE 1 - (embedding <=> CAST(:embedding AS vector)) > :threshold
            ORDER BY similarity_score DESC
            LIMIT :limit
        """)
        
        results = db.execute(sql_query, {
            'embedding': str(query_embedding),
            'threshold': threshold,
            'limit': limit
        }).fetchall()
        
        bookmarks = []
        for row in results:
            bookmark_dict = {
                'id': row.id,
                'url': row.url,
                'title': row.title,
                'description': row.description,
                'domain': row.domain,
                'tags': row.tags or [],
                'meta_data': row.meta_data or {},
                'is_read': row.is_read,
                'reference': row.reference,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
                'similarity_score': float(row.similarity_score)
            }
            bookmarks.append(BookmarkSearchResult(**bookmark_dict))
        
        return bookmarks