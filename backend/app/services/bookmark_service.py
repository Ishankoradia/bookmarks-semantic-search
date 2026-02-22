from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.bookmark import Bookmark
from app.schemas.bookmark import BookmarkUpdate, BookmarkSearchResult, MetadataFilters, DateRangeFilter, BookmarkSave
from app.services.scraper import WebScraper
from app.services.embedding import EmbeddingService
from app.core.logging import get_logger
from app.core.config import settings, SearchMode
from datetime import datetime, timedelta, date
import uuid

class BookmarkService:
    def __init__(self):
        self.scraper = WebScraper()
        self.embedding_service = EmbeddingService()
        self.logger = get_logger(__name__)

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            return parsed.netloc or parsed.path.split('/')[0]
        except:
            return "unknown"

    async def preview_bookmark(self, db: Session, url: str) -> Dict[str, Any]:
        """
        Preview a URL - scrapes content, generates embeddings/tags/category,
        creates a pending bookmark (user_id=NULL), and returns it.
        Returns dict with 'bookmark' and 'scrape_failed' flag.
        """
        domain = self._extract_domain(url)
        scrape_failed = False
        scraped_data = None

        # Try to scrape the URL
        try:
            scraped_data = await self.scraper.scrape_url(url)
            if not scraped_data.get('title'):
                scrape_failed = True
                self.logger.warning(f"Scraping returned no title for {url}")
        except Exception as e:
            scrape_failed = True
            self.logger.warning(f"Scraping failed for {url}: {e}")
            # For invalid URL, still raise - user needs to fix it
            if "Invalid URL" in str(e):
                raise ValueError("Please provide a valid URL")

        # If scraping succeeded, generate embeddings/tags/category
        embedding = None
        auto_tags = []
        suggested_category = "General"

        if not scrape_failed and scraped_data:
            # Generate embedding
            try:
                content_for_embedding = f"{scraped_data['title']} {scraped_data.get('description', '')} {scraped_data['content']}"
                embedding = await self.embedding_service.create_embedding(content_for_embedding)
            except Exception as e:
                self.logger.warning(f"Failed to create embedding: {e}")

            # Generate tags
            try:
                auto_tags = await self.embedding_service.generate_content_tags(
                    title=scraped_data['title'],
                    description=scraped_data.get('description', ''),
                    content=scraped_data['content'],
                    domain=scraped_data['domain']
                )
            except Exception as e:
                self.logger.warning(f"Failed to generate auto-tags: {e}")

            # Generate category
            try:
                suggested_category = await self.embedding_service.generate_content_category(
                    title=scraped_data['title'],
                    content=scraped_data['content']
                )
            except Exception as e:
                self.logger.warning(f"Failed to generate category: {e}")

        # Create pending bookmark (no user_id)
        # Use placeholder title if scraping failed (DB requires non-null title)
        title = scraped_data['title'] if scraped_data and scraped_data.get('title') else ""

        try:
            bookmark = Bookmark(
                url=url,
                title=title,
                description=scraped_data.get('description') if scraped_data else None,
                content=scraped_data['content'] if scraped_data else None,
                raw_html=scraped_data.get('raw_html') if scraped_data else None,
                domain=scraped_data['domain'] if scraped_data else domain,
                embedding=embedding,
                tags=auto_tags,
                category=suggested_category,
                meta_data=scraped_data.get('metadata', {}) if scraped_data else {},
                user_id=None,  # Pending - not claimed yet
            )

            db.add(bookmark)
            db.commit()
            db.refresh(bookmark)

            return {
                'bookmark': bookmark,
                'scrape_failed': scrape_failed
            }

        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to create pending bookmark: {e}")
            raise ValueError("Failed to create bookmark preview. Please try again.")

    def save_bookmark(self, db: Session, save_data: BookmarkSave, user_id: int) -> Bookmark:
        """
        Save/claim a previewed bookmark by setting the user_id and updating category/reference/title.
        """
        # Find the pending bookmark
        bookmark = db.query(Bookmark).filter(
            Bookmark.id == save_data.id,
            Bookmark.user_id.is_(None)  # Must be unclaimed
        ).first()

        if not bookmark:
            raise ValueError("Bookmark not found or already saved")

        # If bookmark has no title (scrape failed), require user-provided title
        if not bookmark.title and not save_data.title:
            raise ValueError("Title is required for this bookmark")

        # Check if user already has this URL bookmarked
        existing = db.query(Bookmark).filter(
            Bookmark.url == bookmark.url,
            Bookmark.user_id == user_id
        ).first()
        if existing:
            # Clean up the pending bookmark
            db.delete(bookmark)
            db.commit()
            raise ValueError("You already have this URL bookmarked")

        # Claim the bookmark and update fields
        bookmark.user_id = user_id
        bookmark.category = save_data.category
        bookmark.reference = save_data.reference
        if save_data.title:
            bookmark.title = save_data.title

        try:
            db.commit()
            db.refresh(bookmark)
            return bookmark
        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to save bookmark: {e}")
            raise ValueError("Failed to save bookmark. Please try again.")

    async def create_bookmark(self, db: Session, url: str, user_id: int) -> Bookmark:
        """
        Create a bookmark directly (for feed save, etc.) without preview step.
        Scrapes, generates embeddings/tags/category, and saves with user_id.
        """
        # Check if bookmark already exists for this user
        existing = db.query(Bookmark).filter(
            Bookmark.url == url,
            Bookmark.user_id == user_id
        ).first()
        if existing:
            raise ValueError("A bookmark with this URL already exists")

        # Scrape the URL
        try:
            scraped_data = await self.scraper.scrape_url(url)
            if not scraped_data.get('title'):
                raise ValueError("Unable to extract content from this URL.")
        except Exception as e:
            if "Invalid URL" in str(e):
                raise ValueError("Please provide a valid URL")
            elif "timeout" in str(e).lower():
                raise TimeoutError("The website took too long to respond")
            elif "connection" in str(e).lower():
                raise ConnectionError("Unable to connect to the website")
            else:
                raise ValueError(f"Failed to process URL: {str(e)}")

        # Generate embedding
        try:
            content_for_embedding = f"{scraped_data['title']} {scraped_data.get('description', '')} {scraped_data['content']}"
            embedding = await self.embedding_service.create_embedding(content_for_embedding)
        except Exception as e:
            self.logger.warning(f"Failed to create embedding: {e}")
            embedding = None

        # Generate tags
        try:
            auto_tags = await self.embedding_service.generate_content_tags(
                title=scraped_data['title'],
                description=scraped_data.get('description', ''),
                content=scraped_data['content'],
                domain=scraped_data['domain']
            )
        except Exception as e:
            self.logger.warning(f"Failed to generate auto-tags: {e}")
            auto_tags = []

        # Generate category
        try:
            category = await self.embedding_service.generate_content_category(
                title=scraped_data['title'],
                content=scraped_data['content']
            )
        except Exception as e:
            self.logger.warning(f"Failed to generate category: {e}")
            category = "General"

        # Create bookmark with user_id
        try:
            bookmark = Bookmark(
                url=url,
                title=scraped_data['title'],
                description=scraped_data.get('description'),
                content=scraped_data['content'],
                raw_html=scraped_data.get('raw_html'),
                domain=scraped_data['domain'],
                embedding=embedding,
                tags=auto_tags,
                category=category,
                meta_data=scraped_data.get('metadata', {}),
                user_id=user_id,
            )

            db.add(bookmark)
            db.commit()
            db.refresh(bookmark)
            return bookmark

        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to create bookmark: {e}")
            raise ValueError("Failed to save bookmark. Please try again.")

    def get_bookmark(self, db: Session, bookmark_id: uuid.UUID, user_id: int) -> Optional[Bookmark]:
        return db.query(Bookmark).filter(Bookmark.id == bookmark_id, Bookmark.user_id == user_id).first()
    
    def get_bookmarks(self, db: Session, user_id: int, skip: int = 0, limit: int = 100, is_read: Optional[bool] = None, categories: Optional[List[str]] = None) -> List[Bookmark]:
        query = db.query(Bookmark).filter(Bookmark.user_id == user_id)
        if is_read is not None:
            if is_read:
                query = query.filter(Bookmark.is_read == True)
            else:
                query = query.filter((Bookmark.is_read == False) | (Bookmark.is_read.is_(None)))
        if categories is not None and len(categories) > 0:
            # Handle "Others" category (null or empty string)
            if "Others" in categories:
                other_categories = [c for c in categories if c != "Others"]
                if other_categories:
                    query = query.filter(
                        (Bookmark.category.in_(other_categories)) |
                        (Bookmark.category.is_(None)) |
                        (Bookmark.category == "")
                    )
                else:
                    query = query.filter((Bookmark.category.is_(None)) | (Bookmark.category == ""))
            else:
                query = query.filter(Bookmark.category.in_(categories))
        return query.order_by(Bookmark.created_at.desc()).offset(skip).limit(limit).all()
    
    def update_bookmark(self, db: Session, bookmark_id: uuid.UUID, update_data: BookmarkUpdate, user_id: int) -> Optional[Bookmark]:
        bookmark = self.get_bookmark(db, bookmark_id, user_id=user_id)
        if not bookmark:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(bookmark, field, value)
        
        db.commit()
        db.refresh(bookmark)
        return bookmark
    
    def delete_bookmark(self, db: Session, bookmark_id: uuid.UUID, user_id: int) -> bool:
        bookmark = self.get_bookmark(db, bookmark_id, user_id=user_id)
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
        user_id: int,
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

        Search method is determined by SEARCH_MODE setting:
        - "semantic": AI embeddings with vector similarity
        - "fulltext": PostgreSQL full-text search
        """
        # Route to full-text search if configured
        if settings.SEARCH_MODE == SearchMode.FULLTEXT:
            self.logger.debug("Using full-text search mode")
            return await self.search_bookmarks_fulltext(
                db=db,
                query=query,
                user_id=user_id,
                limit=limit,
                filters=filters
            )

        # Semantic search (default)
        self.logger.debug("Using semantic search mode")

        # Parse the query to extract filters if auto_parse_query is True
        # Use the original query for vector search (no cleaning)
        parsed_filters = None
        search_query = query
        ambiguous_name = None
        
        if auto_parse_query:
            parsed = await self.embedding_service.parse_search_query(query)
            self.logger.debug(f"Parsed query result: {parsed}")
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
            
            # Category filter (support multiple categories)
            if active_filters.category and len(active_filters.category) > 0:
                category_conditions = []
                for i, category in enumerate(active_filters.category):
                    if category == "Others":
                        # Filter for bookmarks with null or empty category
                        category_conditions.append("(category IS NULL OR category = '')")
                    else:
                        # Filter for exact category match
                        param_name = f"category_{i}"
                        category_conditions.append(f"category = :{param_name}")
                        filter_params[param_name] = category
                
                if category_conditions:
                    # Use OR logic between different categories
                    filter_conditions.append(f"({' OR '.join(category_conditions)})")
            
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
                WHERE user_id = :user_id AND ({where_clause})
            """
            count_query = text(count_query_str)
            
            self.logger.debug(f"Filter conditions: {filter_conditions}")
            self.logger.debug(f"Filter params: {filter_params}")
            self.logger.debug(f"Count query SQL: {count_query_str}")
            
            # Add user_id parameter
            filter_params['user_id'] = user_id
            
            try:
                result = db.execute(count_query, filter_params).fetchone()
                filtered_count = result.count if result else 0
                self.logger.debug(f"Filtered count: {filtered_count}")
            except Exception as e:
                self.logger.error(f"Error executing count query: {e}", exc_info=True)
                # On error, fallback to searching entire database
                filtered_count = 0
            
            if filtered_count > 0:
                # Filters returned results, use filtered search
                vector_threshold = threshold
                
                self.logger.debug(f"Using threshold: {vector_threshold} for {filtered_count} filtered results")
                
                sql_query = text(f"""
                    SELECT 
                        id, url, title, description, content, domain, tags, meta_data,
                        is_read, reference, category, created_at, updated_at,
                        1 - (embedding <=> CAST(:embedding AS vector)) AS similarity_score
                    FROM bookmarks
                    WHERE user_id = :user_id AND ({where_clause})
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
                self.logger.debug("No results from metadata filters, searching entire database")
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
            self.logger.debug(f"Vector search returned {len(results)} results")
            
            # If vector search returned no results and we had metadata filters, 
            # return metadata-filtered results that meet the original threshold
            if len(results) == 0 and filter_conditions:
                self.logger.debug(f"Vector search returned no results, falling back to metadata-filtered results with original threshold: {threshold}")
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
                self.logger.debug(f"Fallback returned {len(results)} results")
                
        except Exception as e:
            self.logger.error(f"Error executing search query: {e}", exc_info=True)
            self.logger.debug(f"Search params: {search_params}")
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

    async def search_bookmarks_fulltext(
        self,
        db: Session,
        query: str,
        user_id: int,
        limit: int = 10,
        filters: Optional[MetadataFilters] = None
    ) -> List[BookmarkSearchResult]:
        """
        Full-text search using PostgreSQL tsvector/tsquery.
        Uses websearch_to_tsquery for user-friendly query parsing.
        Ranks results using ts_rank_cd (cover density ranking).
        """
        # Build filter conditions
        filter_conditions = ["user_id = :user_id"]
        filter_params = {"user_id": user_id, "query": query, "limit": limit}

        if filters:
            # Category filter
            if filters.category and len(filters.category) > 0:
                category_conditions = []
                for i, category in enumerate(filters.category):
                    if category == "Others":
                        category_conditions.append("(category IS NULL OR category = '')")
                    else:
                        param_name = f"category_{i}"
                        category_conditions.append(f"category = :{param_name}")
                        filter_params[param_name] = category
                if category_conditions:
                    filter_conditions.append(f"({' OR '.join(category_conditions)})")

            # Date range filter
            if filters.date_range:
                date_from, date_to = self._get_date_range(filters.date_range)
                if date_from:
                    filter_conditions.append("created_at >= :date_from")
                    filter_params["date_from"] = date_from
                if date_to:
                    filter_conditions.append("created_at <= :date_to")
                    filter_params["date_to"] = date_to

            # Custom date range
            if filters.date_from:
                filter_conditions.append("created_at >= :custom_date_from")
                filter_params["custom_date_from"] = datetime.combine(filters.date_from, datetime.min.time())
            if filters.date_to:
                filter_conditions.append("created_at <= :custom_date_to")
                filter_params["custom_date_to"] = datetime.combine(filters.date_to, datetime.max.time())

            # Domain filter
            if filters.domain:
                filter_conditions.append("domain ~* :domain")
                filter_params["domain"] = filters.domain

            # Reference filter
            if filters.reference:
                filter_conditions.append("LOWER(COALESCE(reference, '')) LIKE LOWER(:reference)")
                filter_params["reference"] = f"%{filters.reference}%"

        where_clause = " AND ".join(filter_conditions)

        sql_query = text(f"""
            SELECT
                id, url, title, description, content, domain, tags, meta_data,
                is_read, reference, category, created_at, updated_at,
                ts_rank_cd(search_vector, websearch_to_tsquery('english', :query), 32) AS similarity_score
            FROM bookmarks
            WHERE {where_clause}
                AND search_vector @@ websearch_to_tsquery('english', :query)
            ORDER BY similarity_score DESC
            LIMIT :limit
        """)

        try:
            results = db.execute(sql_query, filter_params).fetchall()
            self.logger.debug(f"Full-text search returned {len(results)} results")
        except Exception as e:
            self.logger.error(f"Error executing full-text search: {e}", exc_info=True)
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
                'similarity_score': float(row.similarity_score) if row.similarity_score else 0.0
            }
            bookmarks.append(BookmarkSearchResult(**bookmark_dict))

        return bookmarks

    def get_bookmarks_grouped_by_category(self, db: Session, user_id: int) -> Dict[str, List[Bookmark]]:
        """Get bookmarks grouped by category with counts."""
        bookmarks = db.query(Bookmark).filter(Bookmark.user_id == user_id).order_by(Bookmark.created_at.desc()).all()

        grouped = {}
        for bookmark in bookmarks:
            category = bookmark.category or "Others"
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(bookmark)

        return grouped

    def get_category_counts(self, db: Session, user_id: int, is_read: Optional[bool] = None, categories: Optional[List[str]] = None) -> Dict[str, int]:
        """Get category names with bookmark counts (efficient SQL query)."""
        from sqlalchemy import func, case

        query = db.query(
            func.coalesce(
                case((Bookmark.category == '', 'Others'), else_=Bookmark.category),
                'Others'
            ).label('category_name'),
            func.count(Bookmark.id).label('count')
        ).filter(Bookmark.user_id == user_id)

        # Apply read status filter
        if is_read is not None:
            if is_read:
                query = query.filter(Bookmark.is_read == True)
            else:
                query = query.filter((Bookmark.is_read == False) | (Bookmark.is_read.is_(None)))

        # Apply category filter
        if categories:
            query = query.filter(Bookmark.category.in_(categories))

        results = query.group_by('category_name').all()

        return {row.category_name: row.count for row in results}