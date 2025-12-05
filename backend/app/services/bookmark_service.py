from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.bookmark import Bookmark
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate, BookmarkSearchResult, MetadataFilters, DateRangeFilter
from app.services.scraper import WebScraper
from app.services.embedding import EmbeddingService
from datetime import datetime, timedelta, date
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
            # Generate category using GPT-4o mini
            category = await self.embedding_service.generate_content_category(
                title=scraped_data['title'],
                content=scraped_data['content']
            )
            
        except Exception as e:
            print(f"Failed to generate category: {e}")
            # Use default category if generation fails
            category = "General"
        
        try:
            # Create bookmark with auto-generated tags and category
            bookmark = Bookmark(
                url=url,
                title=scraped_data['title'],
                description=scraped_data.get('description'),
                content=scraped_data['content'],
                raw_html=scraped_data['raw_html'],
                domain=scraped_data['domain'],
                embedding=embedding,
                tags=auto_tags,  # Use auto-generated tags
                category=category,  # Use auto-generated category
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
        return db.query(Bookmark).order_by(Bookmark.created_at.desc()).offset(skip).limit(limit).all()
    
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
    
    def _get_date_range(self, date_filter: Optional[DateRangeFilter]) -> tuple[Optional[datetime], Optional[datetime]]:
        """Convert date range filter to actual datetime bounds."""
        if not date_filter:
            return None, None
            
        now = datetime.now()
        date_from = None
        date_to = now
        
        if date_filter == DateRangeFilter.today:
            date_from = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == DateRangeFilter.last_week:
            date_from = now - timedelta(days=7)
        elif date_filter == DateRangeFilter.last_month:
            date_from = now - timedelta(days=30)
        elif date_filter == DateRangeFilter.last_3_months:
            date_from = now - timedelta(days=90)
        elif date_filter == DateRangeFilter.last_year:
            date_from = now - timedelta(days=365)
        elif date_filter == DateRangeFilter.all_time:
            date_from = None
            
        return date_from, date_to
    
    async def search_bookmarks_with_filters(
        self, 
        db: Session, 
        query: str, 
        limit: int = 10,
        threshold: float = 0.5,
        filters: Optional[MetadataFilters] = None,
        auto_parse_query: bool = True
    ) -> List[BookmarkSearchResult]:
        """
        Two-step search: 
        1. Apply metadata filters (OR logic)
        2. Perform vector search on filtered results
        If no results from filtering, fallback to entire database
        """
        
        # Parse the query to extract filters if auto_parse_query is True
        # Use the original query for vector search (no cleaning)
        parsed_filters = None
        search_query = query
        ambiguous_name = None
        
        if auto_parse_query:
            parsed = await self.embedding_service.parse_search_query(query)
            print(f"Parsed query result: {parsed}")
            ambiguous_name = parsed.get("ambiguous_person_name")
            
            # Create filters from parsed query if not provided explicitly
            if not filters:
                # If there's an ambiguous name, we'll handle it separately
                if ambiguous_name:
                    # Don't set domain or reference filters, we'll handle it in the SQL
                    parsed_filters = MetadataFilters(
                        date_range=DateRangeFilter(parsed["date_range"]) if parsed.get("date_range") else None
                    )
                else:
                    parsed_filters = MetadataFilters(
                        domain=parsed.get("domain_filter"),
                        reference=parsed.get("reference_filter"),
                        date_range=DateRangeFilter(parsed["date_range"]) if parsed.get("date_range") else None
                    )
        
        # Use provided filters or parsed filters
        active_filters = filters or parsed_filters
        
        # Build metadata filter conditions
        filter_conditions = []
        filter_params = {}
        
        # Handle ambiguous name - search both domain and reference fields
        if ambiguous_name:
            # Handle NULL reference values with COALESCE
            filter_conditions.append("(domain ~* :ambiguous_name OR LOWER(COALESCE(reference, '')) LIKE LOWER(:ambiguous_name_like))")
            filter_params["ambiguous_name"] = ambiguous_name
            filter_params["ambiguous_name_like"] = f"%{ambiguous_name}%"
        
        if active_filters:
            # Reference filter (case-insensitive partial match)
            if active_filters.reference:
                filter_conditions.append("LOWER(COALESCE(reference, '')) LIKE LOWER(:reference)")
                filter_params["reference"] = f"%{active_filters.reference}%"
            
            # Domain filter (regex match, case-insensitive)
            if active_filters.domain:
                filter_conditions.append("domain ~* :domain")
                filter_params["domain"] = active_filters.domain
            
            # Category filter
            if active_filters.category:
                if active_filters.category == "Others":
                    # Filter for bookmarks with null or empty category
                    filter_conditions.append("(category IS NULL OR category = '')")
                else:
                    # Filter for exact category match
                    filter_conditions.append("category = :category")
                    filter_params["category"] = active_filters.category
            
            # Date range filter
            if active_filters.date_range:
                date_from, date_to = self._get_date_range(active_filters.date_range)
                if date_from:
                    filter_conditions.append("created_at >= :date_from")
                    filter_params["date_from"] = date_from
                if date_to:
                    filter_conditions.append("created_at <= :date_to")
                    filter_params["date_to"] = date_to
            
            # Custom date range (overrides date_range if both provided)
            if active_filters.date_from:
                filter_conditions.append("created_at >= :custom_date_from")
                filter_params["custom_date_from"] = datetime.combine(active_filters.date_from, datetime.min.time())
            if active_filters.date_to:
                filter_conditions.append("created_at <= :custom_date_to")
                filter_params["custom_date_to"] = datetime.combine(active_filters.date_to, datetime.max.time())
        
        # Create embedding for the search query
        query_embedding = await self.embedding_service.create_embedding(search_query)
        
        # Build the SQL query
        if filter_conditions:
            # Apply metadata filters with OR logic
            where_clause = " OR ".join(filter_conditions)
            
            # First, check if filters return any results
            # Use parameterized query instead of f-string for safety
            count_query_str = f"""
                SELECT COUNT(*) as count
                FROM bookmarks
                WHERE {where_clause}
            """
            count_query = text(count_query_str)
            
            print(f"Filter conditions: {filter_conditions}")
            print(f"Filter params: {filter_params}")
            print(f"Count query SQL: {count_query_str}")
            
            try:
                result = db.execute(count_query, filter_params).fetchone()
                filtered_count = result.count if result else 0
                print(f"Filtered count: {filtered_count}")
            except Exception as e:
                print(f"Error executing count query: {e}")
                # On error, fallback to searching entire database
                filtered_count = 0
            
            if filtered_count > 0:
                # Filters returned results, use filtered search
                vector_threshold = threshold
                
                print(f"Using threshold: {vector_threshold} for {filtered_count} filtered results")
                
                sql_query = text(f"""
                    SELECT 
                        id, url, title, description, content, domain, tags, meta_data,
                        is_read, reference, category, created_at, updated_at,
                        1 - (embedding <=> CAST(:embedding AS vector)) AS similarity_score
                    FROM bookmarks
                    WHERE ({where_clause})
                        AND 1 - (embedding <=> CAST(:embedding AS vector)) > :threshold
                    ORDER BY similarity_score DESC
                    LIMIT :limit
                """)
                
                search_params = {**filter_params, 
                               'embedding': str(query_embedding),
                               'threshold': vector_threshold,
                               'limit': limit}
            else:
                # No results from filters, search entire database
                print(f"No results from metadata filters, searching entire database")
                sql_query = text("""
                    SELECT 
                        id, url, title, description, content, domain, tags, meta_data,
                        is_read, reference, category, created_at, updated_at,
                        1 - (embedding <=> CAST(:embedding AS vector)) AS similarity_score
                    FROM bookmarks
                    WHERE 1 - (embedding <=> CAST(:embedding AS vector)) > :threshold
                    ORDER BY similarity_score DESC
                    LIMIT :limit
                """)
                
                search_params = {
                    'embedding': str(query_embedding),
                    'threshold': threshold,
                    'limit': limit
                }
        else:
            # No filters, search entire database
            sql_query = text("""
                SELECT 
                    id, url, title, description, content, domain, tags, meta_data,
                    is_read, reference, category, created_at, updated_at,
                    1 - (embedding <=> CAST(:embedding AS vector)) AS similarity_score
                FROM bookmarks
                WHERE 1 - (embedding <=> CAST(:embedding AS vector)) > :threshold
                ORDER BY similarity_score DESC
                LIMIT :limit
            """)
            
            search_params = {
                'embedding': str(query_embedding),
                'threshold': threshold,
                'limit': limit
            }
        
        try:
            results = db.execute(sql_query, search_params).fetchall()
            print(f"Vector search returned {len(results)} results")
            
            # If vector search returned no results and we had metadata filters, 
            # return metadata-filtered results that meet the original threshold
            if len(results) == 0 and filter_conditions:
                print(f"Vector search returned no results, falling back to metadata-filtered results with original threshold: {threshold}")
                fallback_query = text(f"""
                    SELECT 
                        id, url, title, description, content, domain, tags, meta_data,
                        is_read, reference, category, created_at, updated_at,
                        1 - (embedding <=> CAST(:embedding AS vector)) AS similarity_score
                    FROM bookmarks
                    WHERE ({where_clause})
                        AND 1 - (embedding <=> CAST(:embedding AS vector)) > :threshold
                    ORDER BY similarity_score DESC
                    LIMIT :limit
                """)
                
                fallback_params = {**filter_params, 
                                 'embedding': str(query_embedding),
                                 'threshold': threshold,
                                 'limit': limit}
                
                results = db.execute(fallback_query, fallback_params).fetchall()
                print(f"Fallback returned {len(results)} results")
                
        except Exception as e:
            print(f"Error executing search query: {e}")
            print(f"Search params: {search_params}")
            # Return empty results on error
            return []
        
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
                'category': row.category,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
                'similarity_score': float(row.similarity_score)
            }
            bookmarks.append(BookmarkSearchResult(**bookmark_dict))
        
        return bookmarks
    
    async def search_bookmarks(
        self, 
        db: Session, 
        query: str, 
        limit: int = 10,
        threshold: float = 0.5
    ) -> List[BookmarkSearchResult]:
        """Legacy search method for backward compatibility."""
        return await self.search_bookmarks_with_filters(
            db=db,
            query=query,
            limit=limit,
            threshold=threshold,
            filters=None,
            auto_parse_query=True
        )
    
    async def search_bookmarks_original(
        self, 
        db: Session, 
        query: str, 
        limit: int = 10,
        threshold: float = 0.5
    ) -> List[BookmarkSearchResult]:
        """Original search method without any filtering."""
        query_embedding = await self.embedding_service.create_embedding(query)
        
        sql_query = text("""
            SELECT 
                id, url, title, description, content, domain, tags, meta_data,
                is_read, reference, category, created_at, updated_at,
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
                'category': row.category,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
                'similarity_score': float(row.similarity_score)
            }
            bookmarks.append(BookmarkSearchResult(**bookmark_dict))
        
        return bookmarks
    
    def get_bookmarks_grouped_by_category(self, db: Session) -> Dict[str, List[Bookmark]]:
        """Get bookmarks grouped by category with counts."""
        bookmarks = db.query(Bookmark).order_by(Bookmark.created_at.desc()).all()
        
        grouped = {}
        for bookmark in bookmarks:
            category = bookmark.category or "Others"
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(bookmark)
        
        return grouped
    
    def get_bookmarks_by_category(self, db: Session, category: str, skip: int = 0, limit: int = 100) -> List[Bookmark]:
        """Get bookmarks for a specific category."""
        if category == "Others":
            # Handle null/empty categories
            return db.query(Bookmark).filter(
                (Bookmark.category.is_(None)) | (Bookmark.category == "")
            ).order_by(Bookmark.created_at.desc()).offset(skip).limit(limit).all()
        else:
            return db.query(Bookmark).filter(
                Bookmark.category == category
            ).order_by(Bookmark.created_at.desc()).offset(skip).limit(limit).all()