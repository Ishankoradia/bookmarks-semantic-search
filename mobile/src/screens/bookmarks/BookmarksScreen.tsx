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
type ViewMode = 'list' | 'category';

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

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [categoryBookmarks, setCategoryBookmarks] = useState<Record<string, Bookmark[]>>({});
  const [categoryLoading, setCategoryLoading] = useState<Record<string, boolean>>({});
  const [categoryHasMore, setCategoryHasMore] = useState<Record<string, boolean>>({});
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 30;
  const CATEGORY_PAGE_SIZE = 20;

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

  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode);
    if (searchQuery.trim()) return;

    if (mode === 'category') {
      setLoading(true);
      try {
        const isRead = readFilter === 'all' ? undefined : readFilter === 'read';
        const counts = await bookmarkApi.getCategories(isRead);
        setCategoryCounts(counts);
        setCategoryBookmarks({});
        setCategoryHasMore({});
        setOpenFolders(new Set());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      await loadBookmarks();
      setLoading(false);
    }
  };

  const loadCategoryBookmarks = async (category: string, skip = 0) => {
    setCategoryLoading((prev) => ({ ...prev, [category]: true }));
    try {
      const isRead = readFilter === 'all' ? undefined : readFilter === 'read';
      const data = await bookmarkApi.getBookmarks(skip, CATEGORY_PAGE_SIZE, isRead, [category]);
      setCategoryBookmarks((prev) => ({
        ...prev,
        [category]: skip === 0 ? data : [...(prev[category] || []), ...data],
      }));
      setCategoryHasMore((prev) => ({ ...prev, [category]: data.length === CATEGORY_PAGE_SIZE }));
    } catch {
      // ignore
    } finally {
      setCategoryLoading((prev) => ({ ...prev, [category]: false }));
    }
  };

  const toggleFolder = async (category: string) => {
    const isOpening = !openFolders.has(category);
    setOpenFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
    if (isOpening && !categoryBookmarks[category]) {
      await loadCategoryBookmarks(category);
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
    if (viewMode === 'category') {
      const isRead = readFilter === 'all' ? undefined : readFilter === 'read';
      Promise.all([
        bookmarkApi.getCategories(isRead).then(setCategoryCounts),
        loadCategories(),
      ]).then(() => {
        setCategoryBookmarks({});
        setCategoryHasMore({});
        setOpenFolders(new Set());
      }).finally(() => setLoading(false));
    } else {
      Promise.all([loadBookmarks(), loadCategories()]).finally(() => setLoading(false));
    }
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
        <View style={[styles.viewToggle, { borderColor: colors.border }]}>
          <Pressable
            onPress={() => handleViewModeChange('list')}
            style={[
              styles.viewToggleBtn,
              { backgroundColor: viewMode === 'list' ? colors.primary : 'transparent' },
            ]}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
          <Pressable
            onPress={() => handleViewModeChange('category')}
            style={[
              styles.viewToggleBtn,
              { backgroundColor: viewMode === 'category' ? colors.primary : 'transparent' },
            ]}
          >
            <Ionicons
              name="folder"
              size={18}
              color={viewMode === 'category' ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
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
        <View style={[styles.readFilterGroup, { backgroundColor: colors.muted }]}>
          {(['all', 'unread', 'read'] as ReadFilter[]).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setReadFilter(filter)}
              style={[
                styles.readFilterItem,
                readFilter === filter && [styles.readFilterItemActive, { backgroundColor: colors.card }],
              ]}
            >
              <Text
                style={[
                  styles.readFilterText,
                  {
                    color: readFilter === filter ? colors.foreground : colors.mutedForeground,
                    fontWeight: readFilter === filter ? '600' : '400',
                  },
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

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

      {/* Bookmarks list / category view */}
      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : viewMode === 'category' && !isSearching ? (
        (() => {
          const sortedCategories = Object.keys(categoryCounts).sort();
          const totalBookmarks = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
          return sortedCategories.length === 0 ? (
            <EmptyState
              icon="folder-outline"
              title="No categories yet"
              description="Add bookmarks to see them organized by category"
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
              }
            >
              <Text style={[styles.categorySummary, { color: colors.mutedForeground }]}>
                <Text style={{ fontWeight: '700', color: colors.foreground }}>{sortedCategories.length}</Text>
                {' categories, '}
                <Text style={{ fontWeight: '700', color: colors.foreground }}>{totalBookmarks}</Text>
                {' bookmarks'}
              </Text>
              {sortedCategories.map((category) => {
                const count = categoryCounts[category] || 0;
                const isOpen = openFolders.has(category);
                const items = categoryBookmarks[category] || [];
                const isLoadingCat = categoryLoading[category];
                const hasMoreCat = categoryHasMore[category];

                return (
                  <View
                    key={category}
                    style={[
                      styles.folderCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Pressable onPress={() => toggleFolder(category)} style={styles.folderHeader}>
                      <View style={styles.folderLeft}>
                        <Ionicons
                          name={isOpen ? 'folder-open-outline' : 'folder-outline'}
                          size={20}
                          color={isOpen ? colors.primary : colors.mutedForeground}
                        />
                        <Text style={[styles.folderName, { color: colors.foreground }]}>{category}</Text>
                      </View>
                      <View style={styles.folderRight}>
                        <Text style={[styles.folderCount, { color: colors.mutedForeground }]}>
                          {count} {count === 1 ? 'bookmark' : 'bookmarks'}
                        </Text>
                        <Ionicons
                          name={isOpen ? 'chevron-down' : 'chevron-forward'}
                          size={16}
                          color={colors.mutedForeground}
                        />
                      </View>
                    </Pressable>

                    {isOpen && (
                      <View style={[styles.folderContent, { borderTopColor: colors.border, backgroundColor: colors.muted + '33' }]}>
                        {isLoadingCat && items.length === 0 ? (
                          <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} />
                        ) : (
                          <>
                            {items.map((item) => (
                              <View key={item.id} style={{ marginBottom: 8 }}>
                                <ArticleCard
                                  article={{ ...item, type: 'bookmark' }}
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
                              </View>
                            ))}
                            {hasMoreCat && (
                              <Pressable
                                onPress={() => loadCategoryBookmarks(category, items.length)}
                                disabled={isLoadingCat}
                                style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                              >
                                {isLoadingCat ? (
                                  <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>
                                )}
                              </Pressable>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          );
        })()
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
          ListHeaderComponent={
            <Text style={[styles.bookmarkCount, { color: colors.mutedForeground }]}>
              Found <Text style={{ fontWeight: '700', color: colors.foreground }}>{bookmarks.length}</Text> bookmarks
            </Text>
          }
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
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  readFilterGroup: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
  },
  readFilterItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  readFilterItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  readFilterText: {
    fontSize: 13,
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
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    padding: 8,
  },
  categorySummary: {
    fontSize: 14,
    marginBottom: 12,
  },
  folderCard: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  folderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  folderName: {
    fontSize: 15,
    fontWeight: '600',
  },
  folderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folderCount: {
    fontSize: 13,
  },
  folderContent: {
    borderTopWidth: 1,
    padding: 12,
  },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bookmarkCount: {
    fontSize: 14,
    marginBottom: 8,
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
