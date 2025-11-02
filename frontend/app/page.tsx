"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Bookmark, ExternalLink, Calendar, Tag, Loader2, CheckCircle, Circle, Copy, Check, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { bookmarkApi, Bookmark as BookmarkType, BookmarkSearchResult, TagPreviewResponse } from "@/lib/api"

type FilterTab = "all" | "unread" | "read"

export default function BookmarkSearchApp() {
  const [searchQuery, setSearchQuery] = useState("")
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

  // Load all bookmarks on component mount
  useEffect(() => {
    loadBookmarks()
  }, [])

  const loadBookmarks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await bookmarkApi.getBookmarks()
      setAllBookmarks(data)
      applyFilter(data, activeFilter)
    } catch (err: any) {
      setError('Failed to load bookmarks')
      console.error('Error loading bookmarks:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilter = (data: (BookmarkType | BookmarkSearchResult)[], filter: FilterTab) => {
    switch (filter) {
      case "read":
        setBookmarks(data.filter(bookmark => bookmark.is_read === true))
        break
      case "unread":
        setBookmarks(data.filter(bookmark => bookmark.is_read !== true))
        break
      default:
        setBookmarks(data)
        break
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
        const results = await bookmarkApi.searchBookmarks({
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

  const handleSearch = async () => {
    if (searchQuery.trim() === "") {
      // If no search query, load all bookmarks and apply filter
      await loadBookmarks()
    } else {
      // When searching, always reset filter to "All"
      setActiveFilter("all")
      // Perform semantic search
      try {
        setIsSearching(true)
        setError(null)
        const results = await bookmarkApi.searchBookmarks({
          query: searchQuery,
          limit: 50,
          threshold: 0.3
        })
        // Apply "all" filter (which shows everything) to search results
        applyFilter(results, "all")
      } catch (err: any) {
        setError('Search failed')
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }
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
      await bookmarkApi.createBookmark({ 
        url: newBookmarkUrl,
        reference: newBookmarkReference.trim() || undefined 
      })
      setNewBookmarkUrl("")
      setNewBookmarkReference("")
      setIsDialogOpen(false) // Close the dialog
      // Reload bookmarks to show the new one
      await loadBookmarks()
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
      const preview = await bookmarkApi.previewTags(newBookmarkUrl)
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
      await bookmarkApi.updateReadStatus(bookmarkId, !currentStatus)
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
      const response = await bookmarkApi.regenerateTags(bookmarkId)
      
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
      await bookmarkApi.deleteBookmark(bookmarkToDelete.id)
      
      // Remove from both bookmarks and allBookmarks
      setAllBookmarks(prev => prev.filter(b => b.id !== bookmarkToDelete.id))
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkToDelete.id))
      
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-indigo-600 rounded-xl">
              <Bookmark className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">Semantic Bookmarks</h1>
          </div>
          <p className="text-slate-600 text-lg">Search your bookmarks by meaning, not just keywords</p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Search and Add Section */}
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

          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-14 px-6 bg-indigo-600 hover:bg-indigo-700">
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

        {/* Filter Tabs */}
        <div className="mb-6">
          <Tabs value={activeFilter} onValueChange={(value) => handleFilterChange(value as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
          </Tabs>
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
          <div className="grid gap-6">
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.id} className="hover:shadow-lg transition-shadow border-slate-200">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <a 
                          href={bookmark.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <CardTitle className="text-xl text-balance">{bookmark.title}</CardTitle>
                        </a>
                        {'similarity_score' in bookmark && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            {(bookmark.similarity_score * 100).toFixed(0)}% match
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-base line-clamp-2">{bookmark.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleReadStatusToggle(bookmark.id, bookmark.is_read || false)}
                        className="hover:bg-slate-100"
                        title={bookmark.is_read ? "Mark as unread" : "Mark as read"}
                      >
                        {bookmark.is_read ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleCopyToClipboard(bookmark.url, bookmark.id)}
                        className={`hover:bg-slate-100 transition-colors ${
                          copiedId === bookmark.id ? 'bg-green-50' : ''
                        }`}
                        title={copiedId === bookmark.id ? "Copied!" : "Copy URL to clipboard"}
                      >
                        {copiedId === bookmark.id ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-black" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteClick(bookmark)}
                        className="hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete bookmark"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(bookmark.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={`https://${bookmark.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-600 font-medium hover:text-green-700 hover:underline transition-colors"
                      >
                        {bookmark.domain}
                      </a>
                    </div>
                    {bookmark.reference && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm italic">via: {bookmark.reference}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-4 h-4" />
                      {bookmark.tags && bookmark.tags.length > 0 ? (
                        <>
                          {bookmark.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRegenerateTags(bookmark.id)}
                            disabled={regeneratingTagsId === bookmark.id}
                            className="h-6 px-2 hover:bg-slate-100"
                            title="Regenerate tags"
                          >
                            {regeneratingTagsId === bookmark.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateTags(bookmark.id)}
                          disabled={regeneratingTagsId === bookmark.id}
                          className="h-6 px-2 text-xs"
                        >
                          {regeneratingTagsId === bookmark.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Generate Tags
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                        bookmark.is_read 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {bookmark.is_read ? 'Read' : 'Unread'}
                    </span>
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
