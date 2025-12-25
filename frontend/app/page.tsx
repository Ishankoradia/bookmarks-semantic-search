"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Search, Plus, Bookmark, ExternalLink, Calendar, Tag, Loader2, CheckCircle, Circle, Copy, Check, Trash2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import SimpleAuthButton from "@/components/auth/simple-auth-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useBookmarkApi } from "@/lib/auth-api"
import { Bookmark as BookmarkType, BookmarkSearchResult, TagPreviewResponse, JobStatus } from "@/lib/api"

type FilterTab = "all" | "unread" | "read"

export default function BookmarkSearchApp() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const authApi = useBookmarkApi()
  
  
  // Search mode state
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [newBookmarkUrl, setNewBookmarkUrl] = useState("")
  const [newBookmarkReference, setNewBookmarkReference] = useState("")
  const [isAddingBookmark, setIsAddingBookmark] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<(BookmarkType | BookmarkSearchResult)[]>([])
  const [allBookmarks, setAllBookmarks] = useState<(BookmarkType | BookmarkSearchResult)[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tagPreview, setTagPreview] = useState<TagPreviewResponse | null>(null)
  const [isPreviewingTags, setIsPreviewingTags] = useState(false)
  const [regeneratingTagsId, setRegeneratingTagsId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bookmarkToDelete, setBookmarkToDelete] = useState<{id: string, title: string} | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Category filter state
  const [categoryList, setCategoryList] = useState<string[]>([])
  const [isLoadingCategoryList, setIsLoadingCategoryList] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  
  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Format date in a friendly way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 1) {
      return "just now"
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    } else if (diffDays < 1) {
      return "today"
    } else if (diffDays === 1) {
      return "yesterday"
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months === 1 ? '' : 's'} ago`
    } else {
      // For older dates, show the actual date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadBookmarks()
    loadCategoryList()
  }, [])

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const loadBookmarks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await authApi.getBookmarks()
      setAllBookmarks(data)
      applyFilter(data, activeFilter)
    } catch (err: any) {
      setError('Failed to load bookmarks')
      console.error('Error loading bookmarks:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategoryList = async () => {
    try {
      setIsLoadingCategoryList(true)
      const data = await authApi.getCategoryList()
      console.log('About to set category list:', data)
      setCategoryList(data)
      console.log('Category list state after setting:', data)
    } catch (err: any) {
      console.error('Error loading category list:', err)
    } finally {
      setIsLoadingCategoryList(false)
    }
  }

  const applyFilter = (data: (BookmarkType | BookmarkSearchResult)[], filter: FilterTab, customCategoryFilters?: string[]) => {
    let filtered = data

    // Apply category filters
    const filtersToUse = customCategoryFilters !== undefined ? customCategoryFilters : categoryFilters
    if (filtersToUse.length > 0) {
      filtered = filtered.filter(bookmark => {
        const bookmarkCategory = bookmark.category || "Others"
        return filtersToUse.some(selectedCategory => {
          if (selectedCategory === "Others") {
            return !bookmark.category || bookmark.category === ""
          }
          return bookmark.category === selectedCategory
        })
      })
    }

    // Apply read/unread filter
    switch (filter) {
      case "read":
        filtered = filtered.filter(bookmark => bookmark.is_read === true)
        break
      case "unread":
        filtered = filtered.filter(bookmark => bookmark.is_read !== true)
        break
      default:
        // "all" - no additional filtering
        break
    }

    setBookmarks(filtered)
  }

  const handleCategoryFilterToggle = (category: string) => {
    const newFilters = categoryFilters.includes(category)
      ? categoryFilters.filter(c => c !== category)
      : [...categoryFilters, category]
    
    setCategoryFilters(newFilters)
    
    // Re-apply current filters when category changes
    if (searchQuery.trim() === "") {
      applyFilter(allBookmarks, activeFilter, newFilters)
    } else {
      // Re-run search with updated category filters
      performSearch(searchQuery, newFilters)
    }
  }

  const handleFilterChange = async (filter: FilterTab) => {
    setActiveFilter(filter)
    if (searchQuery.trim() === "") {
      // No search active, filter all bookmarks
      applyFilter(allBookmarks, filter)
    } else {
      // Search is active, re-search and apply the new filter
      try {
        setIsSearching(true)
        setError(null)
        const results = await authApi.searchBookmarks({
          query: searchQuery,
          limit: 50,
          threshold: 0.3
        })
        applyFilter(results, filter)
      } catch (err: any) {
        setError('Search failed')
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }
  }

  const performSearch = async (query: string, customCategoryFilters?: string[]) => {
    if (query.trim() === "") {
      // If no search query, load all bookmarks and apply filters
      await loadBookmarks()
    } else {
      // When searching, always reset filter to "All"
      setActiveFilter("all")
      // Perform semantic search
      try {
        setIsSearching(true)
        setError(null)
        const filters: any = {}
        const filtersToUse = customCategoryFilters !== undefined ? customCategoryFilters : categoryFilters
        if (filtersToUse.length > 0) {
          filters.category = filtersToUse
        }
        const results = await authApi.searchBookmarks({
          query: query,
          limit: 50,
          threshold: 0.3,
          filters: Object.keys(filters).length > 0 ? filters : undefined
        })
        // Apply "all" filter (which shows everything) to search results
        applyFilter(results, "all", filtersToUse)
      } catch (err: any) {
        setError('Search failed')
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }
  }

  const handleSearch = async () => {
    await performSearch(searchQuery)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleAddBookmark = async () => {
    if (!newBookmarkUrl.trim()) {
      setModalError('Please enter a valid URL')
      return
    }
    
    try {
      setIsAddingBookmark(true)
      setModalError(null)
      await authApi.createBookmark({ 
        url: newBookmarkUrl,
        reference: newBookmarkReference.trim() || undefined 
      })
      setNewBookmarkUrl("")
      setNewBookmarkReference("")
      setIsDialogOpen(false) // Close the dialog
      // Reload data based on current view mode
      await loadBookmarks()
      await loadCategoryList()
    } catch (err: any) {
      let errorMessage = 'Failed to add bookmark'
      
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.detail || 'Invalid URL or bookmark already exists'
      } else if (err.response?.status === 422) {
        errorMessage = 'Please enter a valid URL format'
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.'
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection.'
      }
      
      setModalError(errorMessage)
      console.error('Error adding bookmark:', err)
    } finally {
      setIsAddingBookmark(false)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      // Clear modal error, URL, reference, and tag preview when closing
      setModalError(null)
      setNewBookmarkUrl("")
      setNewBookmarkReference("")
      setTagPreview(null)
    }
  }

  const handlePreviewTags = async () => {
    if (!newBookmarkUrl.trim()) {
      setModalError('Please enter a valid URL')
      return
    }

    try {
      setIsPreviewingTags(true)
      setModalError(null)
      const preview = await authApi.previewTags(newBookmarkUrl)
      setTagPreview(preview)
    } catch (err: any) {
      let errorMessage = 'Failed to preview tags'
      
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.detail || 'Unable to access the provided URL'
      } else if (err.response?.status === 422) {
        errorMessage = 'Please enter a valid URL format'
      }
      
      setModalError(errorMessage)
    } finally {
      setIsPreviewingTags(false)
    }
  }

  const handleReadStatusToggle = async (bookmarkId: string, currentStatus: boolean) => {
    try {
      await authApi.updateReadStatus(bookmarkId, !currentStatus)
      // Update the bookmark in both bookmarks and allBookmarks
      const updateBookmark = (bookmark: BookmarkType | BookmarkSearchResult) => 
        bookmark.id === bookmarkId ? { ...bookmark, is_read: !currentStatus } : bookmark
      
      setAllBookmarks(prev => prev.map(updateBookmark))
      setBookmarks(prev => prev.map(updateBookmark))
    } catch (err: any) {
      setError('Failed to update read status')
      console.error('Error updating read status:', err)
    }
  }

  const handleRegenerateTags = async (bookmarkId: string) => {
    try {
      setRegeneratingTagsId(bookmarkId)
      const response = await authApi.regenerateTags(bookmarkId)
      
      // Update the bookmark with new tags
      const updateBookmark = (bookmark: BookmarkType | BookmarkSearchResult) => 
        bookmark.id === bookmarkId ? { ...bookmark, tags: response.tags } : bookmark
      
      setAllBookmarks(prev => prev.map(updateBookmark))
      setBookmarks(prev => prev.map(updateBookmark))
      
      // Show success feedback (could add a toast here)
      setTimeout(() => setRegeneratingTagsId(null), 1000)
    } catch (err: any) {
      console.error('Failed to regenerate tags:', err)
      setError('Failed to regenerate tags')
      setTimeout(() => setError(null), 3000)
      setRegeneratingTagsId(null)
    }
  }

  const handleDeleteBookmark = async () => {
    if (!bookmarkToDelete) return
    
    try {
      setIsDeleting(true)
      await authApi.deleteBookmark(bookmarkToDelete.id)
      
      // Remove from all state
      setAllBookmarks(prev => prev.filter(b => b.id !== bookmarkToDelete.id))
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkToDelete.id))
      
      // Update category list for filter
      await loadCategoryList()
      
      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setBookmarkToDelete(null)
    } catch (err: any) {
      setError('Failed to delete bookmark')
      console.error('Error deleting bookmark:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteClick = (bookmark: BookmarkType | BookmarkSearchResult) => {
    setBookmarkToDelete({ id: bookmark.id, title: bookmark.title })
    setDeleteDialogOpen(true)
  }

  const handleCopyToClipboard = async (url: string, bookmarkId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(bookmarkId)
      setTimeout(() => setCopiedId(null), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopiedId(bookmarkId)
        setTimeout(() => setCopiedId(null), 2000) // Reset after 2 seconds
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr)
        setError('Failed to copy to clipboard')
        setTimeout(() => setError(null), 3000)
      }
    }
  }



  // Debug log for category list state
  console.log('Component render - categoryList length:', categoryList.length, 'isLoading:', isLoadingCategoryList)

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Prevent rendering if not authenticated
  if (status === "unauthenticated") {
    return null
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-xl">
                <Bookmark className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Semantic Bookmarks</h1>
                <p className="text-slate-600 text-lg">Search your bookmarks by meaning, not just keywords</p>
              </div>
            </div>
            <SimpleAuthButton />
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">Your Bookmarks</h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-5 h-5 mr-2" />
                Add Bookmark
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Bookmark</DialogTitle>
                <DialogDescription>
                  Enter a URL to save. We'll scrape the content and create embeddings for semantic search.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{modalError}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="url">URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/article"
                      value={newBookmarkUrl}
                      onChange={(e) => {
                        setNewBookmarkUrl(e.target.value)
                        setTagPreview(null) // Clear preview when URL changes
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isAddingBookmark) {
                          handleAddBookmark()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePreviewTags}
                      disabled={isPreviewingTags || !newBookmarkUrl.trim()}
                      className="px-4"
                    >
                      {isPreviewingTags ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Preview"
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reference">Reference (Optional)</Label>
                  <Textarea
                    id="reference"
                    placeholder="How did you find this bookmark? (e.g., 'Recommended by John', 'Found on HackerNews', 'From newsletter X')"
                    value={newBookmarkReference}
                    onChange={(e) => setNewBookmarkReference(e.target.value)}
                    className="mt-2 min-h-[80px]"
                  />
                </div>

                {/* Tag Preview Section */}
                {tagPreview && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                    <div>
                      <h4 className="font-medium text-slate-900">{tagPreview.title}</h4>
                      {tagPreview.description && (
                        <p className="text-sm text-slate-600 mt-1">{tagPreview.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{tagPreview.domain}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Auto-generated tags:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tagPreview.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleAddBookmark}
                  disabled={isAddingBookmark || !newBookmarkUrl.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {isAddingBookmark ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Save Bookmark"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search View */}
        <div>
            {/* Search Section */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                {isSearching ? (
                  <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
                ) : (
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                )}
                <Input
                  type="text"
                  placeholder="Search bookmarks semantically..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSearching}
                  className="pl-12 h-14 text-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Filter Tabs and Category Filter */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start">
              <Tabs value={activeFilter} onValueChange={(value) => handleFilterChange(value as FilterTab)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="read">Read</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <div className="relative" ref={dropdownRef}>
                  <Button 
                    variant="outline" 
                    className="w-[200px] justify-start"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {categoryFilters.length === 0 ? (
                      "All categories"
                    ) : categoryFilters.length === 1 ? (
                      categoryFilters[0]
                    ) : (
                      `${categoryFilters.length} categories selected`
                    )}
                  </Button>
                  
                  {/* Clickable dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-[300px] bg-white border border-gray-200 shadow-lg rounded-md p-4 z-50 max-h-[400px] overflow-y-auto">
                      <div className="text-sm font-medium mb-3">Filter by categories:</div>
                      
                      <div className="space-y-2">
                        {categoryList.map((category) => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${category}`}
                              checked={categoryFilters.includes(category)}
                              onCheckedChange={() => handleCategoryFilterToggle(category)}
                            />
                            <label
                              htmlFor={`category-${category}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {category}
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      {categoryFilters.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-gray-200">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCategoryFilters([])
                              // Re-apply current filters when clearing categories
                              if (searchQuery.trim() === "") {
                                applyFilter(allBookmarks, activeFilter)
                              } else {
                                handleSearch()
                              }
                            }}
                            className="w-full"
                          >
                            Clear all filters
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-slate-600">
                {isLoading ? (
                  "Loading bookmarks..."
                ) : (
                  <>
                    Found <span className="font-semibold text-slate-900">{bookmarks.length}</span> bookmark
                    {bookmarks.length !== 1 ? "s" : ""}
                    {searchQuery && <span> for "{searchQuery}"</span>}
                  </>
                )}
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">Loading bookmarks...</p>
              </div>
            )}

            {/* Bookmarks Grid */}
            {!isLoading && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
                {bookmarks.map((bookmark) => (
                  <Card 
                    key={bookmark.id} 
                    className="hover:shadow-lg transition-all duration-200 group border-slate-200 h-full"
                  >
                    <CardContent className="p-6 h-full">
                      <div className="flex flex-col h-full">
                        <div className="flex-1 space-y-3">
                        {/* Title */}
                        <h3 
                          className="font-semibold text-lg leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 cursor-pointer"
                          onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
                        >
                          {bookmark.title}
                        </h3>
                        
                        {/* Category */}
                        {bookmark.category && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 text-xs font-medium">
                              {bookmark.category}
                            </span>
                            {'similarity_score' in bookmark && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                {(bookmark.similarity_score * 100).toFixed(0)}% match
                              </span>
                            )}
                          </div>
                        )}
                        
                        
                        {/* Tags */}
                        {bookmark.tags && bookmark.tags.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Tag className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="flex flex-wrap gap-1">
                              {bookmark.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium"
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
                            onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
                            variant="outline"
                            className="w-full border-slate-300 text-slate-700 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Read Article
                          </Button>
                        </div>
                        
                        </div>
                        
                        {/* Actions and meta info */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(bookmark.created_at)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              bookmark.is_read 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {bookmark.is_read ? 'Read' : 'Unread'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleReadStatusToggle(bookmark.id, bookmark.is_read || false)}
                              className="h-7 w-7 p-0 hover:bg-slate-100"
                              title={bookmark.is_read ? "Mark as unread" : "Mark as read"}
                            >
                              {bookmark.is_read ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCopyToClipboard(bookmark.url, bookmark.id)}
                              className={`h-7 w-7 p-0 hover:bg-slate-100 transition-colors ${
                                copiedId === bookmark.id ? 'bg-green-50' : ''
                              }`}
                              title={copiedId === bookmark.id ? "Copied!" : "Copy URL"}
                            >
                              {copiedId === bookmark.id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteClick(bookmark)}
                              className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete bookmark"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && bookmarks.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex p-4 bg-slate-200 rounded-full mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No bookmarks found</h3>
                <p className="text-slate-600">
                  {searchQuery ? "Try a different search term or add a new bookmark" : "Add your first bookmark to get started"}
                </p>
              </div>
            )}
        </div>

        {/* Delete Confirmation Dialog */}
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
              <AlertDialogAction
                onClick={handleDeleteBookmark}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}