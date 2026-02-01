'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePreferencesApi, useFeedApi, useBookmarkApi } from '@/lib/auth-api';
import { FeedArticle, UserPreference } from '@/lib/api';
import { OnboardingModal } from '@/components/explore/OnboardingModal';
import { ArticleCard } from '@/components/explore/ArticleCard';
import { Loader2, RefreshCw, Compass, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ExplorePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savingArticleId, setSavingArticleId] = useState<string | null>(null);
  const preferencesApi = usePreferencesApi();
  const feedApi = useFeedApi();
  const bookmarkApi = useBookmarkApi();

  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  const loadData = async () => {
    try {
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

      const response = await feedApi.getFeed(0, 50);
      setArticles(response.articles);

      // Check for running refresh job
      const jobStatus = await feedApi.getRefreshStatus();
      if ('status' in jobStatus && (jobStatus.status === 'pending' || jobStatus.status === 'running')) {
        setRefreshing(true);
        pollRefreshStatus();
      }
    } catch (error) {
      console.error('Failed to load explore data:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
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

  const handleRefresh = async () => {
    setRefreshing(true);
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
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={{ ...article, type: 'feed' as const }}
              onSave={() => handleSaveArticle(article.id)}
              isSaving={savingArticleId === article.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
