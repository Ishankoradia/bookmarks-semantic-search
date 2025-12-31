"""
Hacker News API Integration

Uses the Algolia-powered HN Search API to fetch articles.
API docs: https://hn.algolia.com/api
"""
import httpx
from typing import List, Optional
from datetime import datetime
from urllib.parse import urlparse
from app.core.logging import get_logger

logger = get_logger(__name__)

HN_SEARCH_API = "https://hn.algolia.com/api/v1/search"


class HNArticle:
    """Represents an article from Hacker News."""

    def __init__(
        self,
        url: str,
        title: str,
        points: int = 0,
        num_comments: int = 0,
        published_at: Optional[datetime] = None,
        hn_url: Optional[str] = None,
    ):
        self.url = url
        self.title = title
        self.points = points
        self.num_comments = num_comments
        self.published_at = published_at
        self.hn_url = hn_url
        self.domain = self._extract_domain(url)
        self.description = f"{points} points · {num_comments} comments on Hacker News"

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
            "domain": self.domain,
            "image_url": None,  # HN doesn't provide images
        }


class HackerNewsAPI:
    """Client for the Hacker News Algolia Search API."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    async def search(
        self,
        query: str,
        limit: int = 10,
        tags: str = "story",
    ) -> List[HNArticle]:
        """
        Search Hacker News for articles.

        Args:
            query: Search query (keyword)
            limit: Maximum number of results
            tags: Filter by type (story, comment, etc.)

        Returns:
            List of HNArticle objects
        """
        articles = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    HN_SEARCH_API,
                    params={
                        "query": query,
                        "tags": tags,
                        "hitsPerPage": limit,
                    },
                    headers={"User-Agent": "BookmarkApp/1.0"},
                )
                response.raise_for_status()
                data = response.json()

                for hit in data.get("hits", []):
                    # Skip if no URL (self-posts)
                    url = hit.get("url")
                    if not url:
                        continue

                    title = hit.get("title", "").strip()
                    if not title:
                        continue

                    # Parse created_at timestamp
                    published_at = None
                    if hit.get("created_at"):
                        try:
                            published_at = datetime.fromisoformat(
                                hit["created_at"].replace("Z", "+00:00")
                            )
                        except Exception:
                            pass

                    # HN discussion URL
                    hn_url = None
                    if hit.get("objectID"):
                        hn_url = f"https://news.ycombinator.com/item?id={hit['objectID']}"

                    article = HNArticle(
                        url=url,
                        title=title,
                        points=hit.get("points", 0),
                        num_comments=hit.get("num_comments", 0),
                        published_at=published_at,
                        hn_url=hn_url,
                    )
                    articles.append(article)

        except httpx.TimeoutException:
            logger.warning(f"Timeout searching HN for: {query}")
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error searching HN: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Error searching HN for '{query}': {e}")

        return articles

    async def get_top_stories(self, limit: int = 10) -> List[HNArticle]:
        """Get top stories from Hacker News front page."""
        return await self.search("", limit=limit, tags="front_page")
