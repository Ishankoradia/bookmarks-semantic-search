import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useFeedApi } from '../../hooks/useFeedApi';
import { ArticleCard } from '../../components/ArticleCard';
import { UserSearchSheet } from '../../components/UserSearchSheet';
import { EmptyState } from '../../components/EmptyState';
import type { FriendBookmark } from '../../types/api';

export function FeedScreen() {
  const { colors } = useTheme();
  const feedApi = useFeedApi();
  const [searchVisible, setSearchVisible] = useState(false);

  const [bookmarks, setBookmarks] = useState<FriendBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  const loadFeed = useCallback(async (skip = 0, append = false) => {
    try {
      const data = await feedApi.getFriendsFeed(skip, PAGE_SIZE);
      if (append) {
        setBookmarks((prev) => [...prev, ...data.bookmarks]);
      } else {
        setBookmarks(data.bookmarks);
      }
      setHasMore(data.has_more);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadFeed().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadFeed(bookmarks.length, true);
    setLoadingMore(false);
  };

  const renderBookmark = ({ item }: { item: FriendBookmark }) => (
    <ArticleCard
      article={{
        ...item,
        type: 'friend',
        owner: {
          email: item.owner.email,
          name: item.owner.name,
          picture: item.owner.picture,
        },
      }}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Friends Feed</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Your feed is empty"
          description="Follow people to see their bookmarks here"
          actionLabel="Find People to Follow"
          onAction={() => setSearchVisible(true)}
        />
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmark}
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

      <UserSearchSheet
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onUserFollowed={() => loadFeed()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
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
