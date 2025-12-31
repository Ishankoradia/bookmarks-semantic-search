"""
RSS Feed Parser Service

Parses RSS/Atom feeds and extracts article metadata.
"""
import feedparser
import httpx
from typing import List, Optional
from datetime import datetime
from urllib.parse import urlparse
from app.core.logging import get_logger

logger = get_logger(__name__)


class RSSArticle:
    """Represents an article parsed from an RSS feed."""

    def __init__(
        self,
        url: str,
        title: str,
        description: Optional[str] = None,
        published_at: Optional[datetime] = None,
        image_url: Optional[str] = None,
        domain: Optional[str] = None,
    ):
        self.url = url
        self.title = title
        self.description = description
        self.published_at = published_at
        self.image_url = image_url
        self.domain = domain or self._extract_domain(url)

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            return parsed.netloc.replace("www.", "")
        except Exception:
            return ""

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "title": self.title,
            "description": self.description,
            "published_at": self.published_at,
            "image_url": self.image_url,
            "domain": self.domain,
        }


class RSSParser:
    """Parses RSS/Atom feeds."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    async def fetch_feed(self, feed_url: str) -> Optional[str]:
        """Fetch RSS feed content."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    feed_url,
                    headers={
                        "User-Agent": "BookmarkApp/1.0 (RSS Reader)",
                        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
                    },
                    follow_redirects=True,
                )
                response.raise_for_status()
                return response.text
        except httpx.TimeoutException:
            logger.warning(f"Timeout fetching RSS feed: {feed_url}")
            return None
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error fetching RSS feed {feed_url}: {e.response.status_code}")
            return None
        except Exception as e:
            logger.error(f"Error fetching RSS feed {feed_url}: {e}")
            return None

    def parse_feed_content(self, content: str, limit: int = 10) -> List[RSSArticle]:
        """Parse RSS feed content and extract articles."""
        articles = []

        try:
            feed = feedparser.parse(content)

            for entry in feed.entries[:limit]:
                # Get article URL
                url = entry.get("link", "")
                if not url:
                    continue

                # Get title
                title = entry.get("title", "").strip()
                if not title:
                    continue

                # Get description/summary
                description = None
                if entry.get("summary"):
                    description = entry.summary[:500]  # Limit description length
                elif entry.get("description"):
                    description = entry.description[:500]

                # Parse published date
                published_at = None
                if entry.get("published_parsed"):
                    try:
                        published_at = datetime(*entry.published_parsed[:6])
                    except Exception:
                        pass
                elif entry.get("updated_parsed"):
                    try:
                        published_at = datetime(*entry.updated_parsed[:6])
                    except Exception:
                        pass

                # Get image URL (from media content or enclosures)
                image_url = None
                if entry.get("media_content"):
                    for media in entry.media_content:
                        if media.get("type", "").startswith("image"):
                            image_url = media.get("url")
                            break
                elif entry.get("enclosures"):
                    for enclosure in entry.enclosures:
                        if enclosure.get("type", "").startswith("image"):
                            image_url = enclosure.get("href")
                            break

                article = RSSArticle(
                    url=url,
                    title=title,
                    description=description,
                    published_at=published_at,
                    image_url=image_url,
                )
                articles.append(article)

        except Exception as e:
            logger.error(f"Error parsing RSS feed: {e}")

        return articles

    async def fetch_and_parse(self, feed_url: str, limit: int = 10) -> List[RSSArticle]:
        """Fetch and parse an RSS feed."""
        content = await self.fetch_feed(feed_url)
        if not content:
            return []

        return self.parse_feed_content(content, limit)
