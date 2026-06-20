"""Text utilities for cleaning scraped / feed content."""
from typing import Optional

import html2text


def _make_converter() -> html2text.HTML2Text:
    """html2text configured to match the page-content scraper."""
    h = html2text.HTML2Text()
    h.ignore_links = False   # keep URLs (as markdown links)
    h.ignore_images = True
    h.body_width = 0         # don't hard-wrap lines
    return h


_converter = _make_converter()


def html_to_text(value: Optional[str]) -> Optional[str]:
    """Convert HTML to plain text/markdown, keeping URLs as markdown links.

    Uses the same html2text settings as the page-content scraper so descriptions
    and content are cleaned consistently. Returns empty/None input unchanged.
    """
    if not value:
        return value

    # Fast path: no markup or entities to convert.
    if "<" not in value and "&" not in value:
        return value

    return _converter.handle(value).strip()
