'use client';

import * as React from 'react';
import {
  ExternalLink,
  Calendar,
  Tag,
  CheckCircle,
  Circle,
  Copy,
  Trash2,
  MoreVertical,
  Bookmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BaseArticle {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  domain?: string | null;
  tags?: string[];
  created_at?: string;
}

interface BookmarkArticle extends BaseArticle {
  type: 'bookmark';
  category?: string | null;
  is_read?: boolean;
  similarity_score?: number;
}

interface FeedArticle extends BaseArticle {
  type: 'feed';
  topic?: string | null;
  source_type?: string | null;
  published_at?: string | null;
  fetched_at: string;
  is_saved: boolean;
}

type Article = BookmarkArticle | FeedArticle;

interface ArticleCardProps {
  article: Article;
  onReadArticle?: () => void;
  onCopyUrl?: () => void;
  // Bookmark-specific actions
  onToggleRead?: () => void;
  onDelete?: () => void;
  // Feed-specific actions
  onSave?: () => void;
  // State
  isSaving?: boolean;
  formatDate?: (date: string) => string;
}

export function ArticleCard({
  article,
  onReadArticle,
  onCopyUrl,
  onToggleRead,
  onDelete,
  onSave,
  isSaving = false,
  formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString();
  },
}: ArticleCardProps) {
  const [openMenu, setOpenMenu] = React.useState(false);

  const handleReadClick = () => {
    if (onReadArticle) {
      onReadArticle();
    } else {
      window.open(article.url, '_blank', 'noopener,noreferrer');
    }
  };

  const isBookmark = article.type === 'bookmark';
  const isFeed = article.type === 'feed';

  // Get the date to display
  const displayDate = isBookmark
    ? article.created_at
    : (article as FeedArticle).published_at || (article as FeedArticle).fetched_at;

  // Get category/topic label
  const categoryLabel = isBookmark
    ? (article as BookmarkArticle).category
    : (article as FeedArticle).topic;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group border h-full">
      <CardContent className="p-6 h-full">
        <div className="flex flex-col h-full">
          <div className="flex-1 space-y-3">
            {/* Title */}
            <h3
              className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
              onClick={handleReadClick}
            >
              {article.title}
            </h3>

            {/* Category/Topic and Match Score */}
            {(categoryLabel || (isBookmark && (article as BookmarkArticle).similarity_score)) && (
              <div className="flex items-center gap-2 flex-wrap">
                {categoryLabel && (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isFeed ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {categoryLabel}
                  </span>
                )}
                {isBookmark && (article as BookmarkArticle).similarity_score && (
                  <span className="px-2 py-1 bg-success/10 text-success rounded text-xs font-medium">
                    {((article as BookmarkArticle).similarity_score! * 100).toFixed(0)}% match
                  </span>
                )}
                {isFeed && (article as FeedArticle).source_type && (
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                    via {(article as FeedArticle).source_type === 'hn' ? 'Hacker News' : 'RSS'}
                  </span>
                )}
              </div>
            )}

            {/* Tags (for bookmarks) */}
            {isBookmark && article.tags && article.tags.length > 0 && (
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="pt-2">
              <Button
                onClick={handleReadClick}
                variant="outline"
                className="w-full hover:bg-primary hover:border-primary hover:text-primary-foreground transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Read Article
              </Button>
            </div>
          </div>

          {/* Actions and meta info */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{displayDate ? formatDate(displayDate) : 'Unknown'}</span>
              {isBookmark && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs',
                    (article as BookmarkArticle).is_read
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  )}
                >
                  {(article as BookmarkArticle).is_read ? 'Read' : 'Unread'}
                </span>
              )}
              {isFeed && (article as FeedArticle).is_saved && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-success/10 text-success">
                  Saved
                </span>
              )}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isBookmark && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleRead}
                    className="h-7 w-7 p-0 hover:bg-muted"
                    title={
                      (article as BookmarkArticle).is_read
                        ? 'Mark as unread'
                        : 'Mark as read'
                    }
                  >
                    {(article as BookmarkArticle).is_read ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCopyUrl}
                    className="h-7 w-7 p-0 hover:bg-muted transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Delete bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}

              {isFeed && !(article as FeedArticle).is_saved && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving}
                  className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                  title="Save to bookmarks"
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Mobile Actions - 3-dot menu */}
            <div className="md:hidden relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setOpenMenu(!openMenu)}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {openMenu && (
                <div
                  className="absolute right-0 top-8 w-48 bg-card rounded-md shadow-xl border py-1 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isBookmark && (
                    <>
                      <button
                        onClick={() => {
                          onToggleRead?.();
                          setOpenMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-left"
                      >
                        {(article as BookmarkArticle).is_read ? (
                          <Circle className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-success" />
                        )}
                        {(article as BookmarkArticle).is_read
                          ? 'Mark as unread'
                          : 'Mark as read'}
                      </button>
                      <button
                        onClick={() => {
                          onCopyUrl?.();
                          setOpenMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-left"
                      >
                        <Copy className="w-4 h-4" />
                        Copy URL
                      </button>
                      <button
                        onClick={() => {
                          onDelete?.();
                          setOpenMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete bookmark
                      </button>
                    </>
                  )}

                  {isFeed && !(article as FeedArticle).is_saved && (
                    <button
                      onClick={() => {
                        onSave?.();
                        setOpenMenu(false);
                      }}
                      disabled={isSaving}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-left"
                    >
                      <Bookmark className="w-4 h-4" />
                      Save to bookmarks
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
