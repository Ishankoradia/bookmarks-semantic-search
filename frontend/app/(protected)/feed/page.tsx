'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFeedApi } from '@/lib/auth-api';
import { FriendBookmark, FriendsFeedResponse } from '@/lib/api';
import { Loader2, ExternalLink, Users, UserPlus, User } from 'lucide-react';
import { UserSearchModal } from '@/components/follows';
import { toast } from 'sonner';

export default function FeedPage() {
  const router = useRouter();
  const [feedData, setFeedData] = useState<FriendsFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const feedApi = useFeedApi();

  const loadFeed = async (skip = 0) => {
    if (skip === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await feedApi.getFriendsFeed(skip, 20);
      if (skip === 0) {
        setFeedData(data);
      } else {
        setFeedData((prev) =>
          prev
            ? {
                ...data,
                bookmarks: [...prev.bookmarks, ...data.bookmarks],
              }
            : data
        );
      }
    } catch (error) {
      console.error('Failed to load friends feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const bookmarks = feedData?.bookmarks || [];

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Friends Feed</h1>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your feed is empty</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Follow people to see their bookmarks here. Discover interesting content from your network.
          </p>
          <UserSearchModal
            trigger={
              <Button size="lg">
                <UserPlus className="h-5 w-5 mr-2" />
                Find People to Follow
              </Button>
            }
            onUserFollowed={() => loadFeed()}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Owner info */}
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={bookmark.owner.picture || undefined}
                      alt={bookmark.owner.name || bookmark.owner.email}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(bookmark.owner.name, bookmark.owner.email) || (
                        <User className="h-3 w-3" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {bookmark.owner.name || bookmark.owner.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(bookmark.created_at)}
                  </span>
                </div>

                {/* Bookmark content */}
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-2">
                    {bookmark.title}
                  </h3>
                  {bookmark.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {bookmark.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{bookmark.domain}</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </a>

                {/* Tags and category */}
                {(bookmark.category || bookmark.tags.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {bookmark.category && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {bookmark.category}
                      </span>
                    )}
                    {bookmark.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {feedData?.has_more && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={() => loadFeed(bookmarks.length)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
