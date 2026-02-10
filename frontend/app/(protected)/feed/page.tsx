'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeedApi } from '@/lib/auth-api';
import { FriendBookmark, FriendsFeedResponse } from '@/lib/api';
import { Loader2, Users, UserPlus } from 'lucide-react';
import { UserSearchModal } from '@/components/follows';
import { ArticleCard } from '@/components/explore/ArticleCard';
import { formatRelativeDate } from '@/lib/utils';
import { toast } from 'sonner';

function FeedCardSkeleton() {
  return (
    <div className="border rounded-xl p-5 space-y-3 bg-card">
      {/* Owner avatar and name */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Title */}
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      {/* Description */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      {/* Category */}
      <Skeleton className="h-4 w-24" />
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

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

  const bookmarks = feedData?.bookmarks || [];

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Friends Feed</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
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
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {bookmarks.map((bookmark) => (
              <ArticleCard
                key={bookmark.id}
                article={{
                  ...bookmark,
                  type: 'friend' as const,
                }}
                formatDate={formatRelativeDate}
              />
            ))}
          </div>

          {feedData?.has_more && (
            <div className="flex justify-center py-6">
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
        </>
      )}
    </div>
  );
}
