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
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

interface FriendBookmarkArticle extends BaseArticle {
  type: 'friend';
  category?: string | null;
  owner: {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
  };
}

type Article = BookmarkArticle | FeedArticle | FriendBookmarkArticle;

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
  const isFriend = article.type === 'friend';

  // Get the date to display
  const displayDate = isBookmark || isFriend
    ? article.created_at
    : (article as FeedArticle).published_at || (article as FeedArticle).fetched_at;

  // Get category/topic label
  const categoryLabel = isBookmark || isFriend
    ? (article as BookmarkArticle | FriendBookmarkArticle).category
    : (article as FeedArticle).topic;

  // Helper to get initials from name/email
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group border h-full overflow-hidden">
      <CardContent className="px-5 py-3 h-full overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 space-y-3 overflow-hidden">
            {/* Owner info for friend bookmarks */}
            {isFriend && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={(article as FriendBookmarkArticle).owner.picture || undefined}
                    alt={(article as FriendBookmarkArticle).owner.name || (article as FriendBookmarkArticle).owner.email}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(
                      (article as FriendBookmarkArticle).owner.name,
                      (article as FriendBookmarkArticle).owner.email
                    ) || <User className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {(article as FriendBookmarkArticle).owner.name || (article as FriendBookmarkArticle).owner.email}
                </span>
              </div>
            )}

            {/* Title with link */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 group/title"
            >
              <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors line-clamp-2 cursor-pointer flex-1 min-w-0">
                {article.title}
              </h3>
              <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1 text-muted-foreground group-hover/title:text-primary transition-colors" />
            </a>

            {/* Description */}
            {article.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {article.description}
              </p>
            )}

            {/* Category/Topic as subtitle */}
            {categoryLabel && (
              <p className="text-muted-foreground text-sm font-medium">
                {categoryLabel}
              </p>
            )}

            {/* Source type for feed articles */}
            {isFeed && (article as FeedArticle).source_type && (
              <span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                via {(article as FeedArticle).source_type === 'hn' ? 'Hacker News' : 'RSS'}
              </span>
            )}

            {/* Tags - shown for both bookmarks and feed articles if available */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions and meta info */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{displayDate ? formatDate(displayDate) : 'Unknown'}</span>
              </div>
              {isBookmark && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs border',
                    (article as BookmarkArticle).is_read
                      ? 'bg-success/10 text-success border-success/30'
                      : 'bg-warning/10 text-warning border-warning/30'
                  )}
                >
                  {(article as BookmarkArticle).is_read ? 'Read' : 'Unread'}
                </span>
              )}
              {isBookmark && (article as BookmarkArticle).similarity_score && (
                <span className="px-2 py-0.5 bg-info/10 text-info border border-info/30 text-xs rounded-full">
                  {((article as BookmarkArticle).similarity_score! * 100).toFixed(0)}% match
                </span>
              )}
              {isFeed && (article as FeedArticle).is_saved && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success border border-success/30">
                  Saved
                </span>
              )}
              {isFriend && article.domain && (
                <span className="text-muted-foreground">
                  {article.domain}
                </span>
              )}
            </div>

            {/* Desktop Actions - only for bookmark and feed types */}
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

            {/* Mobile Actions - 3-dot menu (only for bookmark and unsaved feed types) */}
            {(isBookmark || (isFeed && !(article as FeedArticle).is_saved)) && (
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
