"""
Feed Service

Orchestrates fetching articles from RSS feeds and Hacker News,
and manages the user's Explore feed.
"""
import asyncio
from typing import List, Optional, Set
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.feed_article import FeedArticle
from app.models.user_preference import UserPreference
from app.models.bookmark import Bookmark
from app.services.rss_parser import RSSParser
from app.services.hn_api import HackerNewsAPI
from app.services.scraper import WebScraper
from app.core.topic_sources import get_sources_for_topics
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class FeedService:
    """Service for managing user's Explore feed."""

    def __init__(self):
        self.rss_parser = RSSParser()
        self.hn_api = HackerNewsAPI()
        self.scraper = WebScraper()

    async def refresh_user_feed(
        self,
        db: Session,
        user_id: int,
        interests: List[str],
    ) -> dict:
        """
        Refresh the feed for a user based on their interests.

        Returns:
            dict with articles_fetched and articles_new counts
        """
        logger.info(f"Refreshing feed for user {user_id} with interests: {interests}")

        if not interests:
            logger.warning(f"User {user_id} has no interests, skipping feed refresh")
            return {"articles_fetched": 0, "articles_new": 0}

        # Get existing article URLs to avoid duplicates
        existing_urls = self._get_existing_urls(db, user_id)

        # Get URLs already in user's bookmarks
        bookmark_urls = self._get_bookmark_urls(db, user_id)

        # Combine for deduplication
        skip_urls = existing_urls | bookmark_urls

        # Get sources for user's interests
        sources = get_sources_for_topics(interests)

        # Fetch articles from all sources
        all_articles = []

        # Fetch from RSS feeds
        rss_articles = await self._fetch_rss_articles(
            sources["rss"],
            limit_per_feed=settings.FEED_ARTICLES_PER_TOPIC,
        )
        all_articles.extend(rss_articles)

        # Fetch from Hacker News
        hn_articles = await self._fetch_hn_articles(
            sources["hn_keywords"],
            limit_per_keyword=5,
        )
        all_articles.extend(hn_articles)

        # Deduplicate by URL
        unique_articles = self._deduplicate_articles(all_articles, skip_urls)

        # Limit total articles
        unique_articles = unique_articles[:settings.FEED_MAX_ARTICLES_PER_USER]

        # Save to database
        articles_new = await self._save_articles(db, user_id, unique_articles)

        # Clean up old articles
        self._cleanup_old_articles(db, user_id)

        logger.info(
            f"Feed refresh complete for user {user_id}: "
            f"fetched={len(all_articles)}, new={articles_new}"
        )

        return {
            "articles_fetched": len(all_articles),
            "articles_new": articles_new,
        }

    def _get_existing_urls(self, db: Session, user_id: int) -> Set[str]:
        """Get URLs of articles already in user's feed."""
        articles = db.query(FeedArticle.url).filter(
            FeedArticle.user_id == user_id
        ).all()
        return {a.url for a in articles}

    def _get_bookmark_urls(self, db: Session, user_id: int) -> Set[str]:
        """Get URLs of user's bookmarks."""
        bookmarks = db.query(Bookmark.url).filter(
            Bookmark.user_id == user_id
        ).all()
        return {b.url for b in bookmarks}

    async def _fetch_rss_articles(
        self,
        rss_sources: List[tuple],
        limit_per_feed: int = 10,
    ) -> List[dict]:
        """Fetch articles from RSS feeds."""
        articles = []

        for feed_url, topic in rss_sources:
            try:
                feed_articles = await self.rss_parser.fetch_and_parse(
                    feed_url, limit=limit_per_feed
                )
                for article in feed_articles:
                    article_dict = article.to_dict()
                    article_dict["topic"] = topic
                    article_dict["source_type"] = "rss"
                    articles.append(article_dict)

                # Small delay to be nice to servers
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Error fetching RSS feed {feed_url}: {e}")
                continue

        return articles

    async def _fetch_hn_articles(
        self,
        hn_keywords: List[tuple],
        limit_per_keyword: int = 5,
    ) -> List[dict]:
        """Fetch articles from Hacker News."""
        articles = []

        for keyword, topic in hn_keywords:
            try:
                hn_articles = await self.hn_api.search(
                    query=keyword, limit=limit_per_keyword
                )
                for article in hn_articles:
                    article_dict = article.to_dict()
                    article_dict["topic"] = topic
                    article_dict["source_type"] = "hn"
                    articles.append(article_dict)

                # Small delay to respect rate limits
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Error fetching HN articles for '{keyword}': {e}")
                continue

        return articles

    def _deduplicate_articles(
        self,
        articles: List[dict],
        skip_urls: Set[str],
    ) -> List[dict]:
        """Remove duplicate articles and those already in skip_urls."""
        seen_urls = set()
        unique = []

        for article in articles:
            url = article.get("url", "")
            if url and url not in seen_urls and url not in skip_urls:
                seen_urls.add(url)
                unique.append(article)

        return unique

    async def _save_articles(
        self,
        db: Session,
        user_id: int,
        articles: List[dict],
    ) -> int:
        """Save articles to the database."""
        saved_count = 0

        for article_data in articles:
            try:
                # Check if already exists
                existing = db.query(FeedArticle).filter(
                    and_(
                        FeedArticle.user_id == user_id,
                        FeedArticle.url == article_data["url"]
                    )
                ).first()

                if existing:
                    continue

                feed_article = FeedArticle(
                    user_id=user_id,
                    url=article_data["url"],
                    title=article_data["title"],
                    description=article_data.get("description"),
                    domain=article_data.get("domain"),
                    image_url=article_data.get("image_url"),
                    topic=article_data.get("topic"),
                    source_type=article_data.get("source_type"),
                    published_at=article_data.get("published_at"),
                )
                db.add(feed_article)
                saved_count += 1

            except Exception as e:
                logger.error(f"Error saving article {article_data.get('url')}: {e}")
                continue

        db.commit()
        return saved_count

    def _cleanup_old_articles(self, db: Session, user_id: int) -> int:
        """Remove articles older than configured max age."""
        cutoff_date = datetime.utcnow() - timedelta(days=settings.FEED_ARTICLE_MAX_AGE_DAYS)

        deleted = db.query(FeedArticle).filter(
            and_(
                FeedArticle.user_id == user_id,
                FeedArticle.fetched_at < cutoff_date,
                FeedArticle.is_saved == False,  # Don't delete saved articles
            )
        ).delete(synchronize_session=False)

        db.commit()

        if deleted > 0:
            logger.info(f"Cleaned up {deleted} old articles for user {user_id}")

        return deleted

    def get_user_feed(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> List[FeedArticle]:
        """Get user's feed articles, with not-interested articles at the bottom."""
        query = db.query(FeedArticle).filter(
            FeedArticle.user_id == user_id
        )

        # Order by: not_interested first (False before True), then by fetched_at desc
        return query.order_by(
            FeedArticle.is_not_interested.asc(),
            FeedArticle.fetched_at.desc()
        ).offset(skip).limit(limit).all()

    def get_feed_count(
        self,
        db: Session,
        user_id: int,
    ) -> int:
        """Get count of user's feed articles."""
        return db.query(FeedArticle).filter(
            FeedArticle.user_id == user_id
        ).count()

    def mark_not_interested(
        self,
        db: Session,
        user_id: int,
        article_id: str,
    ) -> Optional[FeedArticle]:
        """Mark an article as not interested."""
        article = db.query(FeedArticle).filter(
            and_(
                FeedArticle.id == article_id,
                FeedArticle.user_id == user_id,
            )
        ).first()

        if article:
            article.is_not_interested = True
            db.commit()
            db.refresh(article)

        return article

    def mark_saved(
        self,
        db: Session,
        user_id: int,
        article_id: str,
    ) -> Optional[FeedArticle]:
        """Mark an article as saved (after creating bookmark)."""
        article = db.query(FeedArticle).filter(
            and_(
                FeedArticle.id == article_id,
                FeedArticle.user_id == user_id,
            )
        ).first()

        if article:
            article.is_saved = True
            db.commit()
            db.refresh(article)

        return article

    def get_article(
        self,
        db: Session,
        user_id: int,
        article_id: str,
    ) -> Optional[FeedArticle]:
        """Get a specific feed article."""
        return db.query(FeedArticle).filter(
            and_(
                FeedArticle.id == article_id,
                FeedArticle.user_id == user_id,
            )
        ).first()
