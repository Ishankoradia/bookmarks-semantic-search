"""
Backfill: strip HTML from stored bookmark & feed_article descriptions.

Existing rows ingested before HTML stripping was added may still contain markup
(``<p>``, ``<a>``) or escaped HTML. This rewrites their ``description`` to plain
text using the same helper used at ingestion time.

Usage (from backend/):
    python -m scripts.clean_descriptions             # apply changes
    python -m scripts.clean_descriptions --dry-run   # preview counts only
"""
import sys

sys.path.insert(0, ".")

from app.core.database import SessionLocal
from app.models.bookmark import Bookmark
from app.models.feed_article import FeedArticle
from app.utils.text import html_to_text

BATCH_SIZE = 500


def clean_table(db, model, label, dry_run):
    # Only consider rows whose description might contain HTML/entities.
    query = (
        db.query(model)
        .filter(model.description.isnot(None))
        .filter(model.description != "")
        .filter(model.description.op("~")(r"[<&]"))
    )

    scanned = 0
    updated = 0
    for row in query.yield_per(BATCH_SIZE):
        scanned += 1
        cleaned = html_to_text(row.description)
        if cleaned != row.description:
            updated += 1
            if not dry_run:
                row.description = cleaned
                if updated % BATCH_SIZE == 0:
                    db.commit()

    if not dry_run:
        db.commit()

    verb = "would update" if dry_run else "updated"
    print(f"{label}: scanned {scanned} candidate rows, {verb} {updated}")
    return scanned, updated


def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("DRY RUN — no changes will be written.\n")

    db = SessionLocal()
    try:
        clean_table(db, Bookmark, "bookmarks", dry_run)
        clean_table(db, FeedArticle, "feed_articles", dry_run)
    finally:
        db.close()


if __name__ == "__main__":
    main()
