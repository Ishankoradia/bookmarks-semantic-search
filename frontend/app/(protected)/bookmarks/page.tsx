'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Plus, Loader2, Filter, X, LayoutGrid, FolderClosed, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArticleCard } from '@/components/explore/ArticleCard';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBookmarkApi } from '@/lib/auth-api';
import { Bookmark as BookmarkType, BookmarkSearchResult } from '@/lib/api';
import { formatRelativeDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton that mimics ArticleCard shape
function BookmarkCardSkeleton() {
  return (
    <div className="border rounded-xl p-5 space-y-3 bg-card">
      {/* Title */}
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      {/* Description */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      {/* Category */}
      <Skeleton className="h-4 w-24" />
      {/* Tags */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

type FilterTab = 'all' | 'unread' | 'read';
type ViewMode = 'grid' | 'category';

export default function BookmarksPage() {
  const authApi = useBookmarkApi();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('');
  const [newBookmarkReference, setNewBookmarkReference] = useState('');
  const [newBookmarkCategory, setNewBookmarkCategory] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [scrapeFailed, setScrapeFailed] = useState(false);
  const [previewData, setPreviewData] = useState<{ id: string; title: string | null; domain: string; tags: string[] } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
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

  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  // Infinite scroll state (grid view)
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Category view state (lazy loading per category)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [categoryBookmarks, setCategoryBookmarks] = useState<Record<string, (BookmarkType | BookmarkSearchResult)[]>>({});
  const [categoryLoading, setCategoryLoading] = useState<Record<string, boolean>>({});
  const [categoryHasMore, setCategoryHasMore] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const savedViewMode = localStorage.getItem('bookmarks-view-mode') as ViewMode;
    if (savedViewMode === 'grid' || savedViewMode === 'category') {
      setViewMode(savedViewMode);
    }

    const initLoad = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (savedViewMode === 'category') {
          // Category view: just fetch category counts
          const counts = await authApi.getCategories();
          setCategoryCounts(counts);
        } else {
          // Grid view: fetch first 20 bookmarks
          const data = await authApi.getBookmarks(0, 20);
          setAllBookmarks(data);
          setBookmarks(data);
          setHasMore(data.length === 20);
        }
      } catch (err) {
        setError('Failed to load bookmarks');
        console.error('Error loading bookmarks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initLoad();
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

  // Infinite scroll (only for grid view without search)
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !isLoading && searchQuery.trim() === '' && viewMode === 'grid') {
      loadBookmarks(allBookmarks.length, activeFilter, categoryFilters);
    }
  }, [loadingMore, hasMore, isLoading, searchQuery, viewMode, allBookmarks.length, activeFilter, categoryFilters]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || viewMode !== 'grid' || searchQuery.trim() !== '') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, viewMode, searchQuery]);

  // Convert filter tab to API parameter
  const getIsReadParam = (filter: FilterTab): boolean | undefined => {
    switch (filter) {
      case 'read':
        return true;
      case 'unread':
        return false;
      default:
        return undefined;
    }
  };

  const loadBookmarks = async (skip = 0, filter: FilterTab = activeFilter, categories: string[] = categoryFilters) => {
    try {
      if (skip === 0) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const isReadParam = getIsReadParam(filter);
      const categoriesParam = categories.length > 0 ? categories : undefined;
      const data = await authApi.getBookmarks(skip, 20, isReadParam, categoriesParam);

      if (skip === 0) {
        setAllBookmarks(data);
        setBookmarks(data);
      } else {
        const newAllBookmarks = [...allBookmarks, ...data];
        setAllBookmarks(newAllBookmarks);
        setBookmarks(newAllBookmarks);
      }

      setHasMore(data.length === 20);
    } catch (err) {
      setError('Failed to load bookmarks');
      console.error('Error loading bookmarks:', err);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
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

  const handleCategoryFilterToggle = async (category: string) => {
    const newFilters = categoryFilters.includes(category)
      ? categoryFilters.filter((c) => c !== category)
      : [...categoryFilters, category];

    setCategoryFilters(newFilters);
    setHasMore(true);
    // Reset to page 0 - clear current data to show loading state
    setAllBookmarks([]);
    setBookmarks([]);

    if (searchQuery.trim() === '') {
      await loadBookmarks(0, activeFilter, newFilters);
    } else {
      performSearch(searchQuery, newFilters);
    }
  };

  const handleFilterChange = async (filter: FilterTab) => {
    setActiveFilter(filter);

    if (searchQuery.trim() !== '') {
      // Search mode: filter client-side
      try {
        setIsSearching(true);
        const filters: { category?: string[] } = {};
        if (categoryFilters.length > 0) {
          filters.category = categoryFilters;
        }
        const results = await authApi.searchBookmarks({
          query: searchQuery,
          limit: 50,
          threshold: 0.3,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        });
        let filtered = results;
        if (filter === 'read') {
          filtered = results.filter((b) => b.is_read === true);
        } else if (filter === 'unread') {
          filtered = results.filter((b) => b.is_read !== true);
        }
        setAllBookmarks(filtered);
        setBookmarks(filtered);
      } catch (err) {
        setError('Search failed');
      } finally {
        setIsSearching(false);
      }
    } else if (viewMode === 'category') {
      // Category view: refetch category counts with new filter
      try {
        setIsLoading(true);
        const isReadParam = getIsReadParam(filter);
        const counts = await authApi.getCategories(isReadParam);
        setCategoryCounts(counts);
        // Reset per-category bookmarks to force reload with new filter
        setCategoryBookmarks({});
        setCategoryHasMore({});
        setOpenFolders(new Set());
      } catch (err) {
        setError('Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Grid view: reload bookmarks
      setHasMore(true);
      setAllBookmarks([]);
      setBookmarks([]);
      await loadBookmarks(0, filter, categoryFilters);
    }
  };

  const performSearch = async (query: string, customCategoryFilters?: string[]) => {
    if (query.trim() === '') {
      setHasMore(true);
      await loadBookmarks();
    } else {
      setActiveFilter('all');
      setHasMore(false); // Disable infinite scroll during search
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
        setAllBookmarks(results);
        setBookmarks(results);
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

  const handlePreviewBookmark = async () => {
    if (!newBookmarkUrl.trim()) {
      setModalError('Please enter a valid URL');
      return;
    }

    try {
      setIsPreviewing(true);
      setModalError(null);
      const preview = await authApi.previewBookmark(newBookmarkUrl);
      setPreviewData({
        id: preview.id,
        title: preview.title,
        domain: preview.domain,
        tags: preview.tags,
      });
      setSuggestedCategory(preview.suggested_category);
      setNewBookmarkCategory(preview.suggested_category);
      setScrapeFailed(preview.scrape_failed);
      if (preview.scrape_failed) {
        setNewBookmarkTitle('');
      }
    } catch (err: any) {
      let errorMessage = 'Failed to preview URL';
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.detail || 'Unable to access URL';
      } else if (err.response?.status === 422) {
        errorMessage = 'Please enter a valid URL format';
      }
      setModalError(errorMessage);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleAddBookmark = async () => {
    if (!previewData) {
      setModalError('Please preview the URL first');
      return;
    }
    if (!newBookmarkCategory.trim()) {
      setModalError('Please select or enter a category');
      return;
    }
    if (scrapeFailed && !newBookmarkTitle.trim()) {
      setModalError('Please enter a title');
      return;
    }

    try {
      setIsAddingBookmark(true);
      setModalError(null);
      await authApi.saveBookmark({
        id: previewData.id,
        category: newBookmarkCategory.trim(),
        reference: newBookmarkReference.trim() || undefined,
        title: scrapeFailed ? newBookmarkTitle.trim() : undefined,
      });
      setNewBookmarkUrl('');
      setNewBookmarkReference('');
      setNewBookmarkCategory('');
      setNewBookmarkTitle('');
      setScrapeFailed(false);
      setPreviewData(null);
      setIsDialogOpen(false);
      await loadBookmarks();
      await loadCategoryList();
      toast.success('Bookmark added!');
    } catch (err: any) {
      let errorMessage = 'Failed to add bookmark';
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.detail || 'Invalid URL or bookmark already exists';
      } else if (err.response?.status === 404) {
        errorMessage = 'Preview expired. Please preview again.';
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
      setNewBookmarkCategory('');
      setSuggestedCategory('');
      setNewBookmarkTitle('');
      setScrapeFailed(false);
      setPreviewData(null);
    }
  };

  const handleReadStatusToggle = async (bookmarkId: string, currentStatus: boolean) => {
    try {
      await authApi.updateReadStatus(bookmarkId, !currentStatus);
      const updateBookmark = (bookmark: BookmarkType | BookmarkSearchResult) =>
        bookmark.id === bookmarkId ? { ...bookmark, is_read: !currentStatus } : bookmark;

      setAllBookmarks((prev) => prev.map(updateBookmark));
      setBookmarks((prev) => prev.map(updateBookmark));

      // Update category bookmarks
      setCategoryBookmarks((prev) => {
        const updated = { ...prev };
        for (const cat in updated) {
          updated[cat] = updated[cat].map(updateBookmark);
        }
        return updated;
      });
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

      // Update category bookmarks and counts
      setCategoryBookmarks((prev) => {
        const updated = { ...prev };
        for (const cat in updated) {
          const before = updated[cat].length;
          updated[cat] = updated[cat].filter((b) => b.id !== bookmarkToDelete.id);
          // Update count if bookmark was removed from this category
          if (updated[cat].length < before) {
            setCategoryCounts((prevCounts) => ({
              ...prevCounts,
              [cat]: Math.max(0, (prevCounts[cat] || 0) - 1),
            }));
          }
        }
        return updated;
      });

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

  // View mode handlers
  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('bookmarks-view-mode', mode);

    if (mode === 'category' && searchQuery.trim() === '') {
      // Category view: fetch category counts only
      try {
        setIsLoading(true);
        const isReadParam = getIsReadParam(activeFilter);
        const counts = await authApi.getCategories(isReadParam);
        setCategoryCounts(counts);
        // Reset per-category state
        setCategoryBookmarks({});
        setCategoryHasMore({});
        setOpenFolders(new Set());
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Load bookmarks for a specific category (uses same API as grid view)
  const loadCategoryBookmarks = async (category: string, skip = 0) => {
    if (skip === 0) {
      setCategoryLoading((prev) => ({ ...prev, [category]: true }));
    }

    try {
      const isReadParam = getIsReadParam(activeFilter);
      // Use the same getBookmarks API with category filter
      const data = await authApi.getBookmarks(skip, 20, isReadParam, [category]);

      setCategoryBookmarks((prev) => ({
        ...prev,
        [category]: skip === 0 ? data : [...(prev[category] || []), ...data],
      }));
      setCategoryHasMore((prev) => ({ ...prev, [category]: data.length === 20 }));
    } catch (err) {
      console.error(`Error loading bookmarks for category ${category}:`, err);
    } finally {
      setCategoryLoading((prev) => ({ ...prev, [category]: false }));
    }
  };

  // Load more bookmarks for a category (infinite scroll)
  const loadMoreCategoryBookmarks = (category: string) => {
    const currentBookmarks = categoryBookmarks[category] || [];
    if (!categoryLoading[category] && categoryHasMore[category]) {
      loadCategoryBookmarks(category, currentBookmarks.length);
    }
  };

  const toggleFolder = async (category: string) => {
    const isOpening = !openFolders.has(category);

    setOpenFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });

    // Load bookmarks when opening a folder for the first time
    if (isOpening && !categoryBookmarks[category]) {
      await loadCategoryBookmarks(category);
    }
  };

  // Sorted categories for category view (from API counts)
  const sortedCategories = useMemo(() => {
    return Object.keys(categoryCounts).sort((a, b) => a.localeCompare(b));
  }, [categoryCounts]);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Your Bookmarks</h1>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-lg">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} rounded-l-lg`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('category')}
                className={`p-2 ${viewMode === 'category' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} rounded-r-lg`}
                title="Category view"
              >
                <FolderClosed className="h-4 w-4" />
              </button>
            </div>
            <Button size="default" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:block">Add Bookmark</span>
            </Button>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bookmark</DialogTitle>
              <DialogDescription>Enter the URL you want to save</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    placeholder="https://example.com/article"
                    value={newBookmarkUrl}
                    onChange={(e) => {
                      setNewBookmarkUrl(e.target.value);
                      setPreviewData(null);
                      setNewBookmarkCategory('');
                    }}
                    disabled={isPreviewing}
                  />
                  <Button
                    onClick={handlePreviewBookmark}
                    disabled={isPreviewing || !newBookmarkUrl.trim()}
                    variant="outline"
                  >
                    {isPreviewing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Preview'
                    )}
                  </Button>
                </div>
              </div>

              {previewData && (
                <>
                  {scrapeFailed ? (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md space-y-1">
                      <p className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                        Could not fetch page content
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        The website may block automated access. Please enter the title manually or try again.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{previewData.domain}</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted rounded-md space-y-1">
                      <p className="font-medium text-sm line-clamp-2">{previewData.title}</p>
                      <p className="text-xs text-muted-foreground">{previewData.domain}</p>
                    </div>
                  )}

                  {scrapeFailed && (
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter a title for this bookmark"
                        value={newBookmarkTitle}
                        onChange={(e) => setNewBookmarkTitle(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <div className="flex gap-2">
                      <Input
                        id="category"
                        placeholder="e.g. Technology, Health, Finance"
                        value={newBookmarkCategory}
                        onChange={(e) => setNewBookmarkCategory(e.target.value)}
                      />
                      {newBookmarkCategory !== suggestedCategory && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewBookmarkCategory(suggestedCategory)}
                          className="shrink-0"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    {!scrapeFailed && (
                      <p className="text-xs text-muted-foreground">
                        AI suggested: {suggestedCategory || 'General'}
                      </p>
                    )}
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
                </>
              )}

              {modalError && <p className="text-sm text-destructive">{modalError}</p>}

              <Button
                onClick={handleAddBookmark}
                disabled={isAddingBookmark || !previewData}
                className="w-full"
              >
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
                onClick={async () => {
                  setCategoryFilters([]);
                  setHasMore(true);
                  // Reset to page 0 - clear current data to show loading state
                  setAllBookmarks([]);
                  setBookmarks([]);
                  if (searchQuery.trim() === '') {
                    await loadBookmarks(0, activeFilter, []);
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
      {!isLoading && bookmarks.length > 0 && viewMode === 'grid' && (
        <p className="text-muted-foreground mb-4">
          Found <span className="font-semibold text-foreground">{bookmarks.length}</span> bookmarks
        </p>
      )}

      {/* Category View Summary */}
      {!isLoading && viewMode === 'category' && sortedCategories.length > 0 && (
        <p className="text-muted-foreground mb-4">
          <span className="font-semibold text-foreground">{sortedCategories.length}</span> categories,{' '}
          <span className="font-semibold text-foreground">{Object.values(categoryCounts).reduce((a, b) => a + b, 0)}</span> bookmarks
        </p>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <BookmarkCardSkeleton key={i} />
          ))}
        </div>
      ) : (viewMode === 'grid' && bookmarks.length === 0) || (viewMode === 'category' && sortedCategories.length === 0) ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No bookmarks found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Add your first bookmark to get started'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {bookmarks.map((bookmark) => (
              <ArticleCard
                key={bookmark.id}
                article={{
                  ...bookmark,
                  type: 'bookmark' as const,
                  similarity_score: 'similarity_score' in bookmark ? bookmark.similarity_score : undefined,
                }}
                onToggleRead={() => handleReadStatusToggle(bookmark.id, bookmark.is_read || false)}
                onCopyUrl={() => handleCopyToClipboard(bookmark.url, bookmark.id)}
                onDelete={() => handleDeleteClick(bookmark)}
                formatDate={formatRelativeDate}
              />
            ))}
          </div>
          {/* Infinite scroll sentinel */}
          {searchQuery.trim() === '' && (
            <>
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Category View */
        <div className="space-y-3">
          {sortedCategories.map((category) => {
            const count = categoryCounts[category] || 0;
            const bookmarksForCategory = categoryBookmarks[category] || [];
            const isOpen = openFolders.has(category);
            const isLoadingCategory = categoryLoading[category];
            const hasMoreInCategory = categoryHasMore[category];

            return (
              <Collapsible key={category} open={isOpen} onOpenChange={() => toggleFolder(category)}>
                <div className="border rounded-lg bg-card">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <FolderOpen className="h-5 w-5 text-primary" />
                        ) : (
                          <Folder className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="font-medium">{category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {count} {count === 1 ? 'bookmark' : 'bookmarks'}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 py-4 bg-muted/20">
                      {isLoadingCategory && bookmarksForCategory.length === 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {[...Array(Math.min(count, 4))].map((_, i) => (
                            <BookmarkCardSkeleton key={i} />
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-4 md:grid-cols-2">
                            {bookmarksForCategory.map((bookmark) => (
                              <ArticleCard
                                key={bookmark.id}
                                article={{
                                  ...bookmark,
                                  type: 'bookmark' as const,
                                  similarity_score: 'similarity_score' in bookmark ? bookmark.similarity_score : undefined,
                                }}
                                onToggleRead={() => handleReadStatusToggle(bookmark.id, bookmark.is_read || false)}
                                onCopyUrl={() => handleCopyToClipboard(bookmark.url, bookmark.id)}
                                onDelete={() => handleDeleteClick(bookmark)}
                                formatDate={formatRelativeDate}
                              />
                            ))}
                          </div>
                          {/* Load more button for category */}
                          {hasMoreInCategory && (
                            <div className="flex justify-center pt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadMoreCategoryBookmarks(category)}
                                disabled={isLoadingCategory}
                              >
                                {isLoadingCategory ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Load More
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
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
