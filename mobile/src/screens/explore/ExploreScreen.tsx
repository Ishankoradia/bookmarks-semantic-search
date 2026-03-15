import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useFeedApi } from '../../hooks/useFeedApi';
import { usePreferencesApi } from '../../hooks/usePreferencesApi';
import { ArticleCard } from '../../components/ArticleCard';
import { OnboardingSheet } from '../../components/OnboardingSheet';
import { EmptyState } from '../../components/EmptyState';
import type { FeedArticle } from '../../types/api';

export function ExploreScreen() {
  const { colors } = useTheme();
  const feedApi = useFeedApi();
  const preferencesApi = usePreferencesApi();
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const PAGE_SIZE = 20;

  const loadArticles = useCallback(async (skip = 0, append = false) => {
    try {
      const data = await feedApi.getFeed(skip, PAGE_SIZE);
      if (append) {
        setArticles((prev) => [...prev, ...data.articles]);
      } else {
        setArticles(data.articles);
      }
      setHasMore(data.has_more);
    } catch {
      // ignore
    }
  }, []);

  const checkOnboarding = async () => {
    try {
      const prefs = await preferencesApi.getPreferences();
      if (!prefs.interests || prefs.interests.length === 0) {
        setNeedsOnboarding(true);
        setOnboardingVisible(true);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    Promise.all([loadArticles(), checkOnboarding()]).finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const handleRefreshFeed = async () => {
    setIsRefreshing(true);
    try {
      await feedApi.refreshFeed();
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const status = await feedApi.getRefreshStatus();
          if ('status' in status && (status.status === 'completed' || status.status === 'failed' || status.status === 'no_refresh')) {
            clearInterval(poll);
            setIsRefreshing(false);
            await loadArticles();
          }
        } catch {
          clearInterval(poll);
          setIsRefreshing(false);
        }
      }, 2000);
    } catch {
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadArticles(articles.length, true);
    setLoadingMore(false);
  };

  const handleSave = async (articleId: string) => {
    setSavingId(articleId);
    try {
      await feedApi.saveArticle(articleId);
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, is_saved: true } : a))
      );
    } catch {
      Alert.alert('Error', 'Failed to save article');
    } finally {
      setSavingId(null);
    }
  };

  const handleNotInterested = async (articleId: string) => {
    try {
      await feedApi.markNotInterested(articleId);
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    } catch {
      // ignore
    }
  };

  const renderArticle = ({ item }: { item: FeedArticle }) => (
    <ArticleCard
      article={{ ...item, type: 'feed' }}
      onSave={() => handleSave(item.id)}
      isSaving={savingId === item.id}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Explore</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Discover articles based on your interests
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleRefreshFeed}
            disabled={isRefreshing}
            style={[styles.headerBtn, { backgroundColor: colors.muted }]}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={18} color={colors.foreground} />
            )}
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : articles.length === 0 ? (
        <EmptyState
          icon="compass-outline"
          title="No articles yet"
          description="Refresh to discover new articles based on your interests"
          actionLabel="Refresh"
          onAction={handleRefreshFeed}
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : null
          }
        />
      )}

      <OnboardingSheet
        visible={onboardingVisible}
        onClose={() => setOnboardingVisible(false)}
        onComplete={() => {
          setNeedsOnboarding(false);
          setOnboardingVisible(false);
          handleRefreshFeed();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  footer: {
    paddingVertical: 16,
  },
});
