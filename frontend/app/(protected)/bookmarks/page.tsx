'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, ExternalLink, Loader2, CheckCircle, Circle, Copy, Check, Trash2, Filter, MoreVertical, X, Tag, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBookmarkApi } from '@/lib/auth-api';
import { Bookmark as BookmarkType, BookmarkSearchResult } from '@/lib/api';
import { toast } from 'sonner';

type FilterTab = 'all' | 'unread' | 'read';

export default function BookmarksPage() {
  const authApi = useBookmarkApi();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('');
  const [newBookmarkReference, setNewBookmarkReference] = useState('');
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<(BookmarkType | BookmarkSearchResult)[]>([]);
  const [allBookmarks, setAllBookmarks] = useState<(BookmarkType | BookmarkSearchResult)[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBookmarks();
    loadCategoryList();
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const loadBookmarks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await authApi.getBookmarks();
      setAllBookmarks(data);
      applyFilter(data, activeFilter);
    } catch (err) {
      setError('Failed to load bookmarks');
      console.error('Error loading bookmarks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategoryList = async () => {
    try {
      const data = await authApi.getCategoryList();
      setCategoryList(data);
    } catch (err) {
      console.error('Error loading category list:', err);
    }
  };

  const applyFilter = (data: (BookmarkType | BookmarkSearchResult)[], filter: FilterTab, customCategoryFilters?: string[]) => {
    let filtered = data;
    const filtersToUse = customCategoryFilters !== undefined ? customCategoryFilters : categoryFilters;

    if (filtersToUse.length > 0) {
      filtered = filtered.filter((bookmark) => {
        const bookmarkCategory = bookmark.category || 'Others';
        return filtersToUse.some((selectedCategory) => {
          if (selectedCategory === 'Others') {
            return !bookmark.category || bookmark.category === '';
          }
          return bookmark.category === selectedCategory;
        });
      });
    }

    switch (filter) {
      case 'read':
        filtered = filtered.filter((bookmark) => bookmark.is_read === true);
        break;
      case 'unread':
        filtered = filtered.filter((bookmark) => bookmark.is_read !== true);
        break;
    }

    setBookmarks(filtered);
  };

  const handleCategoryFilterToggle = (category: string) => {
    const newFilters = categoryFilters.includes(category)
      ? categoryFilters.filter((c) => c !== category)
      : [...categoryFilters, category];

    setCategoryFilters(newFilters);

    if (searchQuery.trim() === '') {
      applyFilter(allBookmarks, activeFilter, newFilters);
    } else {
      performSearch(searchQuery, newFilters);
    }
  };

  const handleFilterChange = async (filter: FilterTab) => {
    setActiveFilter(filter);
    if (searchQuery.trim() === '') {
      applyFilter(allBookmarks, filter);
    } else {
      try {
        setIsSearching(true);
        const results = await authApi.searchBookmarks({
          query: searchQuery,
          limit: 50,
          threshold: 0.3,
        });
        applyFilter(results, filter);
      } catch (err) {
        setError('Search failed');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const performSearch = async (query: string, customCategoryFilters?: string[]) => {
    if (query.trim() === '') {
      await loadBookmarks();
    } else {
      setActiveFilter('all');
      try {
        setIsSearching(true);
        setError(null);
        const filters: any = {};
        const filtersToUse = customCategoryFilters !== undefined ? customCategoryFilters : categoryFilters;
        if (filtersToUse.length > 0) {
          filters.category = filtersToUse;
        }
        const results = await authApi.searchBookmarks({
          query,
          limit: 50,
          threshold: 0.3,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        });
        applyFilter(results, 'all', filtersToUse);
      } catch (err) {
        setError('Search failed');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSearch = async () => {
    await performSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddBookmark = async () => {
    if (!newBookmarkUrl.trim()) {
      setModalError('Please enter a valid URL');
      return;
    }

    try {
      setIsAddingBookmark(true);
      setModalError(null);
      await authApi.createBookmark({
        url: newBookmarkUrl,
        reference: newBookmarkReference.trim() || undefined,
      });
      setNewBookmarkUrl('');
      setNewBookmarkReference('');
      setIsDialogOpen(false);
      await loadBookmarks();
      await loadCategoryList();
      toast.success('Bookmark added!');
    } catch (err: any) {
      let errorMessage = 'Failed to add bookmark';
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.detail || 'Invalid URL or bookmark already exists';
      } else if (err.response?.status === 422) {
        errorMessage = 'Please enter a valid URL format';
      }
      setModalError(errorMessage);
    } finally {
      setIsAddingBookmark(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setModalError(null);
      setNewBookmarkUrl('');
      setNewBookmarkReference('');
    }
  };

  const handleReadStatusToggle = async (bookmarkId: string, currentStatus: boolean) => {
    try {
      await authApi.updateReadStatus(bookmarkId, !currentStatus);
      const updateBookmark = (bookmark: BookmarkType | BookmarkSearchResult) =>
        bookmark.id === bookmarkId ? { ...bookmark, is_read: !currentStatus } : bookmark;

      setAllBookmarks((prev) => prev.map(updateBookmark));
      setBookmarks((prev) => prev.map(updateBookmark));
    } catch (err) {
      toast.error('Failed to update read status');
    }
  };

  const handleDeleteBookmark = async () => {
    if (!bookmarkToDelete) return;

    try {
      setIsDeleting(true);
      await authApi.deleteBookmark(bookmarkToDelete.id);

      setAllBookmarks((prev) => prev.filter((b) => b.id !== bookmarkToDelete.id));
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkToDelete.id));

      await loadCategoryList();
      setDeleteDialogOpen(false);
      setBookmarkToDelete(null);
      toast.success('Bookmark deleted');
    } catch (err) {
      toast.error('Failed to delete bookmark');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (bookmark: BookmarkType | BookmarkSearchResult) => {
    setBookmarkToDelete({ id: bookmark.id, title: bookmark.title });
    setDeleteDialogOpen(true);
  };

  const handleCopyToClipboard = async (url: string, bookmarkId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(bookmarkId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('URL copied!');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Your Bookmarks</h1>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Bookmark
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bookmark</DialogTitle>
              <DialogDescription>Enter the URL you want to save</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com/article"
                  value={newBookmarkUrl}
                  onChange={(e) => setNewBookmarkUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference (optional)</Label>
                <Textarea
                  id="reference"
                  placeholder="Who shared this? Where did you find it?"
                  value={newBookmarkReference}
                  onChange={(e) => setNewBookmarkReference(e.target.value)}
                  rows={2}
                />
              </div>
              {modalError && <p className="text-sm text-destructive">{modalError}</p>}
              <Button onClick={handleAddBookmark} disabled={isAddingBookmark} className="w-full">
                {isAddingBookmark ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Bookmark'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value === '') {
                loadBookmarks();
              }
            }}
            onKeyDown={handleKeyPress}
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Tabs value={activeFilter} onValueChange={(v) => handleFilterChange(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Filter */}
          <div className="relative flex items-center gap-2" ref={dropdownRef}>
            <Filter className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm ${
                categoryFilters.length > 0 ? 'ring-2 ring-primary' : ''
              }`}
            >
              {categoryFilters.length === 0
                ? 'All categories'
                : categoryFilters.length === 1
                ? categoryFilters[0]
                : `${categoryFilters.length} categories`}
            </button>
            {categoryFilters.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setCategoryFilters([]);
                  if (searchQuery.trim() === '') {
                    applyFilter(allBookmarks, activeFilter, []);
                  } else {
                    performSearch(searchQuery, []);
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isDropdownOpen && categoryList.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-popover border rounded-md shadow-lg z-50 p-2 space-y-1">
                {categoryList.map((category) => (
                  <div
                    key={category}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    onClick={() => handleCategoryFilterToggle(category)}
                  >
                    <Checkbox checked={categoryFilters.includes(category)} />
                    <span className="text-sm truncate">{category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md">{error}</div>
      )}

      {/* Bookmark Count */}
      {!isLoading && bookmarks.length > 0 && (
        <p className="text-muted-foreground mb-4">
          Found <span className="font-semibold text-foreground">{bookmarks.length}</span> bookmarks
        </p>
      )}

      {/* Bookmarks Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No bookmarks found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Add your first bookmark to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.id}>
              <CardContent className="p-5">
                {/* Title */}
                <h3 className="font-semibold text-lg line-clamp-2 mb-1">
                  {bookmark.title}
                </h3>

                {/* Category */}
                {bookmark.category && (
                  <p className="text-muted-foreground text-sm mb-3">
                    {bookmark.category}
                  </p>
                )}

                {/* Tags */}
                {bookmark.tags && bookmark.tags.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {bookmark.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Read Article Button */}
                <Button
                  variant="outline"
                  className="w-full mb-4"
                  asChild
                >
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Article
                  </a>
                </Button>

                {/* Bottom row: Date, Status, Menu */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(bookmark.created_at)}
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full border ${
                        bookmark.is_read
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-warning/10 text-warning border-warning/30'
                      }`}
                    >
                      {bookmark.is_read ? 'Read' : 'Unread'}
                    </span>
                    {'similarity_score' in bookmark && (
                      <span className="px-2 py-0.5 bg-info/10 text-info border border-info/30 text-xs rounded-full">
                        {Math.round(bookmark.similarity_score * 100)}% match
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setOpenMenuId(openMenuId === bookmark.id ? null : bookmark.id)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>

                    {openMenuId === bookmark.id && (
                      <div
                        className="absolute right-0 top-8 w-48 bg-card rounded-md shadow-xl border py-1 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            handleReadStatusToggle(bookmark.id, bookmark.is_read || false);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-left"
                        >
                          {bookmark.is_read ? (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                          {bookmark.is_read ? 'Mark as unread' : 'Mark as read'}
                        </button>
                        <button
                          onClick={() => {
                            handleCopyToClipboard(bookmark.url, bookmark.id);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-muted text-left"
                        >
                          <Copy className="w-4 h-4" />
                          Copy URL
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteClick(bookmark);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete bookmark
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bookmark</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{bookmarkToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBookmark} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
