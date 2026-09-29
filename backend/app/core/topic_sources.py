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
            "https://stratechery.com/feed/",
            "https://awealthofcommonsense.com/feed/",
            "https://ritholtz.com/feed/",
            "https://www.calculatedriskblog.com/feeds/posts/default",
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
    "Security & Privacy": {
        "rss": [
            "https://krebsonsecurity.com/feed/",
            "https://www.schneier.com/feed/atom/",
            "https://www.bleepingcomputer.com/feed/",
            "https://feeds.feedburner.com/TheHackersNews",
        ],
        "hn_keywords": ["security", "cybersecurity", "privacy", "encryption", "vulnerability"],
    },
    "Web Development": {
        "rss": [
            "https://css-tricks.com/feed/",
            "https://web.dev/feed.xml",
            "https://developer.mozilla.org/en-US/blog/rss.xml",
            "https://www.joshwcomeau.com/rss.xml",
        ],
        "hn_keywords": ["javascript", "frontend", "css", "react", "typescript"],
    },
    "Data Science & Analytics": {
        "rss": [
            "https://www.kdnuggets.com/feed",
            "https://flowingdata.com/feed/",
            "https://simplystatistics.org/index.xml",
        ],
        "hn_keywords": ["data science", "data engineering", "analytics", "sql", "statistics"],
    },
    "Open Source": {
        "rss": [
            "https://github.blog/feed/",
            "https://opensource.com/feed",
            "https://lwn.net/headlines/rss",
        ],
        "hn_keywords": ["open source", "foss", "linux", "self-hosted"],
    },
    "Gaming": {
        "rss": [
            "https://www.polygon.com/rss/index.xml",
            "https://www.rockpapershotgun.com/feed",
            "https://kotaku.com/rss",
        ],
        "hn_keywords": ["gaming", "game development", "gamedev", "indie games"],
    },
    "Space & Astronomy": {
        "rss": [
            "https://www.universetoday.com/feed/",
            "https://spacenews.com/feed/",
            "https://www.space.com/feeds/all",
        ],
        "hn_keywords": ["space", "nasa", "astronomy", "spacex", "rocket"],
    },
    "Climate & Environment": {
        "rss": [
            "https://grist.org/feed/",
            "https://insideclimatenews.org/feed/",
            "https://www.carbonbrief.org/feed/",
        ],
        "hn_keywords": ["climate", "environment", "renewable energy", "sustainability"],
    },
    "Economics": {
        "rss": [
            "https://marginalrevolution.com/feed",
            "https://www.calculatedriskblog.com/feeds/posts/default",
        ],
        "hn_keywords": ["economics", "economy", "inflation", "monetary policy"],
    },
    "Health & Wellness": {
        "rss": [
            "https://www.health.harvard.edu/blog/feed",
        ],
        "hn_keywords": ["health", "nutrition", "fitness", "sleep", "mental health"],
    },
    "Books & Writing": {
        "rss": [
            "https://lithub.com/feed/",
            "https://www.themarginalian.org/feed/",
        ],
        "hn_keywords": ["books", "writing", "reading", "literature"],
    },
    "Marketing & Growth": {
        "rss": [
            "https://blog.hubspot.com/marketing/rss.xml",
            "https://sparktoro.com/blog/feed/",
            "https://cxl.com/blog/feed/",
        ],
        "hn_keywords": ["marketing", "seo", "growth", "advertising", "branding"],
    },
    "Self-Improvement": {
        "rss": [
            "https://fs.blog/feed/",
            "https://markmanson.net/feed",
        ],
        "hn_keywords": ["psychology", "self improvement", "mental health", "habits"],
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
