'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePreferencesApi, useFeedApi } from '@/lib/auth-api';
import { FeedArticle, UserPreference } from '@/lib/api';
import { OnboardingModal } from '@/components/explore/OnboardingModal';
import { ArticleCard } from '@/components/explore/ArticleCard';
import { formatRelativeDate } from '@/lib/utils';
import { Loader2, RefreshCw, Compass, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

function ExploreCardSkeleton() {
  return (
    <div className="border rounded-lg p-2.5 bg-card flex items-center gap-3">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 flex-1 max-w-[300px]" />
      <Skeleton className="h-4 w-20 hidden sm:block" />
      <Skeleton className="h-5 w-16 rounded hidden sm:block" />
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savingArticleId, setSavingArticleId] = useState<string | null>(null);
  const preferencesApi = usePreferencesApi();
  const feedApi = useFeedApi();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  const loadData = async (skip = 0) => {
    try {
      if (skip === 0) {
        const [prefs, topics] = await Promise.all([
          preferencesApi.getPreferences(),
          preferencesApi.getTopics(),
        ]);
        setPreferences(prefs);
        setAvailableTopics(topics);

        if (!prefs.interests || prefs.interests.length === 0) {
          setShowOnboarding(true);
          setLoading(false);
          return;
        }
      }

      const response = await feedApi.getFeed(skip, 20);

      if (skip === 0) {
        setArticles(response.articles);
      } else {
        setArticles((prev) => [...prev, ...response.articles]);
      }

      setHasMore(response.articles.length === 20);

      // Check for running refresh job (only on initial load)
      if (skip === 0) {
        const jobStatus = await feedApi.getRefreshStatus();
        if ('status' in jobStatus && (jobStatus.status === 'pending' || jobStatus.status === 'running')) {
          setRefreshing(true);
          pollRefreshStatus();
        }
      }
    } catch (error) {
      console.error('Failed to load explore data:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const pollRefreshStatus = () => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await feedApi.getRefreshStatus();
        if ('status' in status) {
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setRefreshing(false);
            loadData();
            toast.success('Feed refreshed!');
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setRefreshing(false);
            toast.error('Feed refresh failed');
          }
        }
      } catch (error) {
        clearInterval(pollInterval);
        setRefreshing(false);
      }
    }, 2000);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      loadData(articles.length);
    }
  }, [loadingMore, hasMore, loading, articles.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

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
  }, [handleLoadMore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setHasMore(true);
    try {
      await feedApi.refreshFeed();
      pollRefreshStatus();
      toast.success('Refreshing feed...');
    } catch (error: any) {
      setRefreshing(false);
      toast.error(error.response?.data?.detail || 'Failed to refresh feed');
    }
  };

  const handleSaveArticle = async (articleId: string) => {
    setSavingArticleId(articleId);
    try {
      await feedApi.saveArticle(articleId);
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, is_saved: true } : a))
      );
      toast.success('Saved to bookmarks!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save article');
    } finally {
      setSavingArticleId(null);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Explore</h1>
            <Skeleton className="h-4 w-48 mt-1" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <ExploreCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <OnboardingModal
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
        topics={availableTopics}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Explore</h1>
          {preferences?.interests && preferences.interests.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Articles based on your interests
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/profile')}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Interests
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16">
          <Compass className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No articles yet</h2>
          <p className="text-muted-foreground mb-6">
            Refresh to discover articles based on your interests
          </p>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Feed
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={{ ...article, type: 'feed' as const }}
                onSave={() => handleSaveArticle(article.id)}
                isSaving={savingArticleId === article.id}
                formatDate={formatRelativeDate}
              />
            ))}
          </div>
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
