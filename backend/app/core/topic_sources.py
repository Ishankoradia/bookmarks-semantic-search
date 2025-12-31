"""
Topic to RSS feeds and Hacker News tags mapping.

Each topic maps to:
- rss: List of RSS feed URLs
- hn_keywords: Keywords to search on Hacker News Algolia API
"""

TOPIC_SOURCES = {
    "Technology": {
        "rss": [
            "https://www.theverge.com/rss/index.xml",
            "https://feeds.arstechnica.com/arstechnica/technology",
            "https://techcrunch.com/feed/",
            "https://www.wired.com/feed/rss",
        ],
        "hn_keywords": ["technology", "tech"],
    },
    "Programming": {
        "rss": [
            "https://dev.to/feed",
            "https://blog.codinghorror.com/rss/",
            "https://martinfowler.com/feed.atom",
            "https://overreacted.io/rss.xml",
        ],
        "hn_keywords": ["programming", "coding", "software"],
    },
    "AI & Machine Learning": {
        "rss": [
            "https://openai.com/blog/rss.xml",
            "https://blog.google/technology/ai/rss/",
            "https://www.deeplearning.ai/blog/feed/",
            "https://lilianweng.github.io/index.xml",
        ],
        "hn_keywords": ["machine learning", "artificial intelligence", "llm", "gpt"],
    },
    "Startups & Business": {
        "rss": [
            "https://blog.ycombinator.com/feed/",
            "https://a16z.com/feed/",
            "https://www.paulgraham.com/rss.html",
            "https://review.firstround.com/feed.xml",
        ],
        "hn_keywords": ["startup", "entrepreneurship", "funding", "vc"],
    },
    "Product & Design": {
        "rss": [
            "https://www.smashingmagazine.com/feed/",
            "https://uxdesign.cc/feed",
            "https://www.nngroup.com/feed/rss/",
            "https://alistapart.com/main/feed/",
        ],
        "hn_keywords": ["design", "ux", "product management", "ui"],
    },
    "DevOps & Cloud": {
        "rss": [
            "https://aws.amazon.com/blogs/aws/feed/",
            "https://cloud.google.com/blog/rss/",
            "https://kubernetes.io/feed.xml",
            "https://www.hashicorp.com/blog/feed.xml",
        ],
        "hn_keywords": ["devops", "kubernetes", "docker", "cloud", "aws"],
    },
    "Career & Growth": {
        "rss": [
            "https://www.kalzumeus.com/feed/",
            "https://blog.pragmaticengineer.com/rss/",
            "https://randsinrepose.com/feed/",
            "https://staffeng.com/feeds/feed.xml",
        ],
        "hn_keywords": ["career", "interview", "salary", "job"],
    },
    "Science": {
        "rss": [
            "https://www.quantamagazine.org/feed/",
            "https://www.sciencedaily.com/rss/all.xml",
            "https://phys.org/rss-feed/",
            "https://www.nature.com/nature.rss",
        ],
        "hn_keywords": ["science", "physics", "biology", "research"],
    },
    "Finance & Investing": {
        "rss": [
            "https://www.bloomberg.com/feed/podcast/etf-report.xml",
            "https://feeds.a]cast.com/public/shows/allinchamath",
            "https://stratechery.com/feed/",
        ],
        "hn_keywords": ["finance", "investing", "stocks", "crypto", "bitcoin"],
    },
    "Productivity": {
        "rss": [
            "https://www.calnewport.com/blog/feed/",
            "https://jamesclear.com/feed",
            "https://nesslabs.com/feed",
        ],
        "hn_keywords": ["productivity", "habits", "workflow", "tools"],
    },
}


def get_sources_for_topics(topics: list[str]) -> dict:
    """
    Get all RSS feeds and HN keywords for a list of topics.

    Returns:
        {
            "rss": [(url, topic), ...],
            "hn_keywords": [(keyword, topic), ...]
        }
    """
    rss_feeds = []
    hn_keywords = []

    for topic in topics:
        sources = TOPIC_SOURCES.get(topic, {})
        for rss_url in sources.get("rss", []):
            rss_feeds.append((rss_url, topic))
        for keyword in sources.get("hn_keywords", []):
            hn_keywords.append((keyword, topic))

    return {
        "rss": rss_feeds,
        "hn_keywords": hn_keywords,
    }
