import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useBookmarkApi } from '../../hooks/useBookmarkApi';
import { ArticleCard } from '../../components/ArticleCard';
import { AddBookmarkSheet } from '../../components/AddBookmarkSheet';
import { BottomModal } from '../../components/BottomModal';
import { EmptyState } from '../../components/EmptyState';
import type { Bookmark, BookmarkSearchResult } from '../../types/api';

type ReadFilter = 'all' | 'unread' | 'read';

export function BookmarksScreen() {
  const { colors } = useTheme();
  const bookmarkApi = useBookmarkApi();
  const [addVisible, setAddVisible] = useState(false);

  const [bookmarks, setBookmarks] = useState<(Bookmark | BookmarkSearchResult)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);

  const PAGE_SIZE = 30;

  const loadBookmarks = useCallback(
    async (skip = 0, append = false) => {
      try {
        const isRead = readFilter === 'all' ? undefined : readFilter === 'read';
        const cats = selectedCategories.length > 0 ? selectedCategories : undefined;
        const data = await bookmarkApi.getBookmarks(skip, PAGE_SIZE, isRead, cats);
        if (append) {
          setBookmarks((prev) => [...prev, ...data]);
        } else {
          setBookmarks(data);
        }
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        // ignore
      }
    },
    [readFilter, selectedCategories]
  );

  const loadCategories = async () => {
    try {
      const data = await bookmarkApi.getCategoryList();
      setCategories(data);
    } catch {
      // ignore
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      loadBookmarks();
      return;
    }
    setIsSearching(true);
    setLoading(true);
    try {
      const results = await bookmarkApi.searchBookmarks({
        query: searchQuery.trim(),
        limit: 30,
        filters: selectedCategories.length > 0 ? { category: selectedCategories } : undefined,
      });
      setBookmarks(results);
      setHasMore(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadBookmarks(), loadCategories()]).finally(() => setLoading(false));
  }, [readFilter, selectedCategories]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (isSearching) {
      await handleSearch();
    } else {
      await loadBookmarks();
    }
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || isSearching) return;
    setLoadingMore(true);
    await loadBookmarks(bookmarks.length, true);
    setLoadingMore(false);
  };

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    try {
      await bookmarkApi.updateReadStatus(id, !currentRead);
      setBookmarks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_read: !currentRead } : b))
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await bookmarkApi.deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
  };

  const handleUpdateTags = async (id: string, tags: string[]) => {
    await bookmarkApi.updateTags(id, tags);
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, tags } : b)));
  };

  const handleCopyUrl = async (url: string) => {
    await Clipboard.setStringAsync(url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    handleSearch();
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const renderBookmark = ({ item }: { item: Bookmark | BookmarkSearchResult }) => (
    <ArticleCard
      article={{
        ...item,
        type: 'bookmark',
        similarity_score: 'similarity_score' in item ? item.similarity_score : undefined,
      }}
      onToggleRead={() => handleToggleRead(item.id, !!item.is_read)}
      onDelete={() =>
        Alert.alert('Delete Bookmark', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
        ])
      }
      onUpdateTags={(tags) => handleUpdateTags(item.id, tags)}
      onTagClick={handleTagClick}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholder="Search bookmarks..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchTextInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
                loadBookmarks();
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setAddVisible(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['all', 'unread', 'read'] as ReadFilter[]).map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setReadFilter(filter)}
            style={[
              styles.filterChip,
              {
                backgroundColor: readFilter === filter ? colors.primary : colors.muted,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: readFilter === filter ? colors.primaryForeground : colors.mutedForeground,
                },
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => setShowCategories(!showCategories)}
          style={[
            styles.filterChip,
            {
              backgroundColor: selectedCategories.length > 0 ? colors.primary : colors.muted,
            },
          ]}
        >
          <Ionicons
            name="filter"
            size={14}
            color={selectedCategories.length > 0 ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.filterText,
              {
                color:
                  selectedCategories.length > 0
                    ? colors.primaryForeground
                    : colors.mutedForeground,
              },
            ]}
          >
            {selectedCategories.length > 0 ? `${selectedCategories.length}` : 'Category'}
          </Text>
        </Pressable>
      </View>

      {/* Category filter modal */}
      <BottomModal visible={showCategories} onClose={() => setShowCategories(false)}>
        <View style={styles.categoryModal}>
          <View style={styles.categoryHeader}>
            <Text style={[styles.categoryTitle, { color: colors.foreground }]}>Filter by Category</Text>
            <Pressable onPress={() => setShowCategories(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          {selectedCategories.length > 0 && (
            <Pressable onPress={() => setSelectedCategories([])}>
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear all</Text>
            </Pressable>
          )}
          <ScrollView style={styles.categoryScroll}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => toggleCategory(cat)}
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: selectedCategories.includes(cat)
                      ? colors.primary + '1A'
                      : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={selectedCategories.includes(cat) ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={selectedCategories.includes(cat) ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.categoryText, { color: colors.foreground }]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => setShowCategories(false)}
            style={[styles.categoryDoneBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.categoryDoneText, { color: colors.primaryForeground }]}>Done</Text>
          </Pressable>
        </View>
      </BottomModal>

      {/* Bookmarks list */}
      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title={isSearching ? 'No results found' : 'No bookmarks yet'}
          description={
            isSearching
              ? 'Try a different search query'
              : 'Add your first bookmark with the + button'
          }
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

      <AddBookmarkSheet
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onBookmarkAdded={() => {
          setIsSearching(false);
          setSearchQuery('');
          loadBookmarks();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryModal: {
    padding: 20,
    maxHeight: '70%',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryDoneBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  categoryDoneText: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryText: {
    fontSize: 14,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  footer: {
    paddingVertical: 16,
  },
});
