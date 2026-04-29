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
  ChevronDown,
  ChevronRight,
  Globe,
  Pencil,
  X,
  Plus,
  Loader2,
  Folder,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    id?: string;
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
  onUpdateTags?: (tags: string[]) => Promise<void>;
  onUpdateCategory?: (category: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
  availableCategories?: string[];
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
  onUpdateTags,
  onUpdateCategory,
  onTagClick,
  availableCategories = [],
  onSave,
  isSaving = false,
  formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString();
  },
}: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Tag editing state
  const [isEditingTags, setIsEditingTags] = React.useState(false);
  const [editedTags, setEditedTags] = React.useState<string[]>([]);
  const [newTagInput, setNewTagInput] = React.useState('');
  const [isSavingTags, setIsSavingTags] = React.useState(false);
  const tagInputRef = React.useRef<HTMLInputElement>(null);
  const tagEditContainerRef = React.useRef<HTMLDivElement>(null);
  const originalTagsRef = React.useRef<string[]>([]);

  // Category editing state
  const [isEditingCategory, setIsEditingCategory] = React.useState(false);
  const [categorySearch, setCategorySearch] = React.useState('');
  const [isSavingCategory, setIsSavingCategory] = React.useState(false);
  const categoryEditRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenu]);

  // Close tag editing when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagEditContainerRef.current && !tagEditContainerRef.current.contains(event.target as Node)) {
        setIsEditingTags(false);
        setEditedTags([]);
        setNewTagInput('');
      }
    };

    if (isEditingTags) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingTags]);

  // Close category editing when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryEditRef.current && !categoryEditRef.current.contains(event.target as Node)) {
        setIsEditingCategory(false);
        setCategorySearch('');
      }
    };

    if (isEditingCategory) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingCategory]);

  const handleSelectCategory = async (category: string) => {
    if (!onUpdateCategory || category === categoryLabel) {
      setIsEditingCategory(false);
      setCategorySearch('');
      return;
    }
    setIsSavingCategory(true);
    try {
      await onUpdateCategory(category);
      setIsEditingCategory(false);
      setCategorySearch('');
    } catch {
      // keep editing open on error
    } finally {
      setIsSavingCategory(false);
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

  // Check if there's expandable content
  const hasExpandableContent = article.description || (article.tags && article.tags.length > 0) || (isBookmark && onUpdateTags);

  // Tag editing handlers
  const startEditingTags = () => {
    const initialTags = article.tags || [];
    setEditedTags(initialTags);
    originalTagsRef.current = initialTags;
    setIsEditingTags(true);
    setNewTagInput('');
    // Expand if not already
    if (!isExpanded) {
      setIsExpanded(true);
    }
    // Focus input after render
    setTimeout(() => tagInputRef.current?.focus(), 100);
  };

  const removeTag = async (tagToRemove: string) => {
    const newTags = editedTags.filter(t => t !== tagToRemove);
    setEditedTags(newTags);
    // Auto-save
    if (onUpdateTags) {
      setIsSavingTags(true);
      try {
        await onUpdateTags(newTags);
      } catch (error) {
        console.error('Failed to save tags:', error);
        // Revert on error
        setEditedTags(editedTags);
      } finally {
        setIsSavingTags(false);
      }
    }
  };

  const addTag = async () => {
    const tag = newTagInput.trim().toLowerCase();
    if (tag && !editedTags.includes(tag)) {
      const newTags = [...editedTags, tag];
      setEditedTags(newTags);
      setNewTagInput('');
      tagInputRef.current?.focus();
      // Auto-save
      if (onUpdateTags) {
        setIsSavingTags(true);
        try {
          await onUpdateTags(newTags);
        } catch (error) {
          console.error('Failed to save tags:', error);
          // Revert on error
          setEditedTags(editedTags);
        } finally {
          setIsSavingTags(false);
        }
      }
    } else {
      setNewTagInput('');
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      setIsEditingTags(false);
      setEditedTags([]);
      setNewTagInput('');
    }
  };

  // Get favicon URL
  const faviconUrl = article.domain
    ? `https://www.google.com/s2/favicons?domain=${article.domain}&sz=32`
    : null;

  return (
    <div className="border rounded-lg bg-card hover:bg-muted/30 transition-colors group">
      {/* Compact Row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Expand/Collapse button */}
        {hasExpandableContent ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Favicon */}
        <div className="flex-shrink-0">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <Globe className={cn("w-4 h-4 text-muted-foreground", faviconUrl && "hidden")} />
        </div>

        {/* Title & Domain */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm truncate hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {article.title}
          </a>
          <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
            {article.domain}
          </span>
        </div>

        {/* Friend avatar */}
        {isFriend && (
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarImage
              src={(article as FriendBookmarkArticle).owner.picture || undefined}
              alt={(article as FriendBookmarkArticle).owner.name || (article as FriendBookmarkArticle).owner.email}
            />
            <AvatarFallback className="text-[10px]">
              {getInitials(
                (article as FriendBookmarkArticle).owner.name,
                (article as FriendBookmarkArticle).owner.email
              ) || <User className="h-2.5 w-2.5" />}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Category pill */}
        {categoryLabel && (
          <span className="flex-shrink-0 px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs hidden sm:inline">
            {categoryLabel}
          </span>
        )}

        {/* Read status indicator (bookmark only) */}
        {isBookmark && (
          <div
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              (article as BookmarkArticle).is_read ? "bg-success" : "bg-warning"
            )}
            title={(article as BookmarkArticle).is_read ? "Read" : "Unread"}
          />
        )}

        {/* Similarity score (when searching) */}
        {isBookmark && (article as BookmarkArticle).similarity_score && (
          <span className="flex-shrink-0 text-xs text-info font-medium">
            {((article as BookmarkArticle).similarity_score! * 100).toFixed(0)}%
          </span>
        )}

        {/* Feed saved indicator */}
        {isFeed && (article as FeedArticle).is_saved && (
          <Bookmark className="w-3.5 h-3.5 text-success flex-shrink-0" />
        )}

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {isBookmark && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead?.();
                }}
                className="h-6 w-6 p-0 hover:bg-muted"
                title={(article as BookmarkArticle).is_read ? 'Mark as unread' : 'Mark as read'}
              >
                {(article as BookmarkArticle).is_read ? (
                  <CheckCircle className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyUrl?.();
                }}
                className="h-6 w-6 p-0 hover:bg-muted"
                title="Copy URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                title="Delete bookmark"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {isFeed && !(article as FeedArticle).is_saved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSave?.();
              }}
              disabled={isSaving}
              className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
              title="Save to bookmarks"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Mobile Actions - 3-dot menu */}
        {(isBookmark || (isFeed && !(article as FeedArticle).is_saved)) && (
          <div className="md:hidden relative flex-shrink-0" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(!openMenu);
              }}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>

            {openMenu && (
              <div
                className="absolute right-0 top-7 w-44 bg-card rounded-md shadow-xl border py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {isBookmark && (
                  <>
                    <button
                      onClick={() => {
                        onToggleRead?.();
                        setOpenMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                    >
                      {(article as BookmarkArticle).is_read ? (
                        <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                      )}
                      {(article as BookmarkArticle).is_read ? 'Mark unread' : 'Mark read'}
                    </button>
                    <button
                      onClick={() => {
                        onCopyUrl?.();
                        setOpenMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy URL
                    </button>
                    <button
                      onClick={() => {
                        onDelete?.();
                        setOpenMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                    {onUpdateTags && (
                      <button
                        onClick={() => {
                          startEditingTags();
                          setOpenMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit tags
                      </button>
                    )}
                  </>
                )}

                {isFeed && !(article as FeedArticle).is_saved && (
                  <button
                    onClick={() => {
                      onSave?.();
                      setOpenMenu(false);
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Save
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && hasExpandableContent && (
        <div className="px-3 pb-3 pt-0 ml-9 border-t mt-0 space-y-2">
          <div className="pt-2" />

          {/* Description */}
          {article.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {article.description}
            </p>
          )}

          {/* Tags */}
          {isEditingTags ? (
            // Edit mode
            <div ref={tagEditContainerRef} className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {editedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                <Input
                  ref={tagInputRef}
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add tag..."
                  className="h-6 text-xs px-2 py-0 flex-1 min-w-0"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addTag}
                  disabled={!newTagInput.trim() || isSavingTags}
                  className="h-6 w-6 p-0"
                >
                  {isSavingTags ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // View mode
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              {article.tags && article.tags.length > 0 ? (
                article.tags.slice(0, 5).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onTagClick?.(tag)}
                    className={cn(
                      "px-2 py-0.5 bg-primary/10 text-primary rounded text-xs",
                      onTagClick && "hover:bg-primary/20 cursor-pointer transition-colors"
                    )}
                  >
                    {tag}
                  </button>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">No tags</span>
              )}
              {isBookmark && onUpdateTags && (
                <button
                  onClick={startEditingTags}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Edit tags"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Meta info row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {displayDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(displayDate)}</span>
              </div>
            )}
            {isFeed && (article as FeedArticle).source_type && (
              <span>
                via {(article as FeedArticle).source_type === 'hn' ? 'Hacker News' : 'RSS'}
              </span>
            )}
            {isFriend && (
              <span>
                by {(article as FriendBookmarkArticle).owner.name || (article as FriendBookmarkArticle).owner.email}
              </span>
            )}
            {/* Category with edit */}
            {isEditingCategory ? (
              <div ref={categoryEditRef} className="relative">
                <div className="flex items-center gap-1">
                  <Folder className="w-3 h-3" />
                  {isSavingCategory ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Input
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && categorySearch.trim()) {
                          handleSelectCategory(categorySearch.trim());
                        } else if (e.key === 'Escape') {
                          setIsEditingCategory(false);
                          setCategorySearch('');
                        }
                      }}
                      placeholder="Search or create..."
                      className="h-6 text-xs w-40 px-1.5"
                      autoFocus
                    />
                  )}
                </div>
                {!isSavingCategory && (
                  <div className="absolute top-7 left-0 z-50 w-48 max-h-40 overflow-y-auto bg-popover border rounded-md shadow-md">
                    {availableCategories
                      .filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()))
                      .map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleSelectCategory(cat)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 text-xs hover:bg-muted flex items-center justify-between",
                            cat === categoryLabel && "text-primary font-medium"
                          )}
                        >
                          {cat}
                          {cat === categoryLabel && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    {categorySearch.trim() && !availableCategories.some(
                      (c) => c.toLowerCase() === categorySearch.trim().toLowerCase()
                    ) && (
                      <button
                        onClick={() => handleSelectCategory(categorySearch.trim())}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted text-primary flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Create &quot;{categorySearch.trim()}&quot;
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : categoryLabel ? (
              <span className="flex items-center gap-1">
                {categoryLabel}
                {isBookmark && onUpdateCategory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingCategory(true);
                      setCategorySearch('');
                    }}
                    className="hover:text-foreground"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </span>
            ) : isBookmark && onUpdateCategory ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingCategory(true);
                  setCategorySearch('');
                }}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Folder className="w-3 h-3" />
                <span>Add category</span>
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
