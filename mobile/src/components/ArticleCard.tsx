import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  Alert,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { formatRelativeDate, getInitials } from '../lib/utils';
import { BottomModal } from './BottomModal';

interface BaseArticle {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  domain?: string | null;
  tags?: string[];
  created_at?: string;
}

interface BookmarkArticle extends BaseArticle {
  type: 'bookmark';
  category?: string | null;
  is_read?: boolean;
  similarity_score?: number;
}

interface FeedArticle extends BaseArticle {
  type: 'feed';
  topic?: string | null;
  source_type?: string | null;
  published_at?: string | null;
  fetched_at: string;
  is_saved: boolean;
}

interface FriendBookmarkArticle extends BaseArticle {
  type: 'friend';
  category?: string | null;
  owner: {
    email: string;
    name: string | null;
    picture: string | null;
  };
}

type Article = BookmarkArticle | FeedArticle | FriendBookmarkArticle;

interface ArticleCardProps {
  article: Article;
  onToggleRead?: () => void;
  onDelete?: () => void;
  onUpdateTags?: (tags: string[]) => Promise<void>;
  onTagClick?: (tag: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export function ArticleCard({
  article,
  onToggleRead,
  onDelete,
  onUpdateTags,
  onTagClick,
  onSave,
  isSaving = false,
}: ArticleCardProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);

  const isBookmark = article.type === 'bookmark';
  const isFeed = article.type === 'feed';
  const isFriend = article.type === 'friend';

  const displayDate =
    isBookmark || isFriend
      ? article.created_at
      : (article as FeedArticle).published_at || (article as FeedArticle).fetched_at;

  const categoryLabel =
    isBookmark || isFriend
      ? (article as BookmarkArticle | FriendBookmarkArticle).category
      : (article as FeedArticle).topic;

  const faviconUrl = article.domain
    ? `https://www.google.com/s2/favicons?domain=${article.domain}&sz=32`
    : null;

  const hasExpandableContent =
    article.description || (article.tags && article.tags.length > 0) || (isBookmark && onUpdateTags);

  const handleOpenUrl = () => Linking.openURL(article.url);

  const handleCopyUrl = async () => {
    await Clipboard.setStringAsync(article.url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMenu(true);
  };

  type MenuItem = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    destructive?: boolean;
  };

  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { label: 'Open in Browser', icon: 'open-outline', onPress: handleOpenUrl },
      { label: 'Copy URL', icon: 'copy-outline', onPress: handleCopyUrl },
    ];

    if (isBookmark) {
      const bm = article as BookmarkArticle;
      items.push({
        label: bm.is_read ? 'Mark Unread' : 'Mark Read',
        icon: bm.is_read ? 'ellipse-outline' : 'checkmark-circle-outline',
        onPress: () => onToggleRead?.(),
      });
      if (onUpdateTags) {
        items.push({ label: 'Edit Tags', icon: 'pricetag-outline', onPress: startEditingTags });
      }
      items.push({
        label: 'Delete',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => {
          Alert.alert('Delete Bookmark', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete?.() },
          ]);
        },
      });
    } else if (isFeed && !(article as FeedArticle).is_saved) {
      items.push({ label: 'Save to Bookmarks', icon: 'bookmark-outline', onPress: () => onSave?.() });
    }

    return items;
  };

  const startEditingTags = () => {
    setEditedTags(article.tags || []);
    setIsEditingTags(true);
    setNewTagInput('');
    if (!isExpanded) setIsExpanded(true);
  };

  const removeTag = async (tagToRemove: string) => {
    const newTags = editedTags.filter((t) => t !== tagToRemove);
    setEditedTags(newTags);
    if (onUpdateTags) {
      setIsSavingTags(true);
      try {
        await onUpdateTags(newTags);
      } catch {
        setEditedTags(editedTags);
      } finally {
        setIsSavingTags(false);
      }
    }
  };

  const addTag = async () => {
    const tag = newTagInput.trim().toLowerCase();
    if (tag && !editedTags.includes(tag)) {
      const newTags = [...editedTags, tag];
      setEditedTags(newTags);
      setNewTagInput('');
      if (onUpdateTags) {
        setIsSavingTags(true);
        try {
          await onUpdateTags(newTags);
        } catch {
          setEditedTags(editedTags);
        } finally {
          setIsSavingTags(false);
        }
      }
    } else {
      setNewTagInput('');
    }
  };

  const getOwnerInitials = () => {
    if (!isFriend) return '';
    const owner = (article as FriendBookmarkArticle).owner;
    return getInitials(owner.name, owner.email);
  };

  return (
    <>
    <Pressable
      onLongPress={openMenu}
      onPress={() => hasExpandableContent && setIsExpanded(!isExpanded)}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Compact Row */}
      <View style={styles.compactRow}>
        {/* Expand chevron */}
        {hasExpandableContent ? (
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={colors.mutedForeground}
          />
        ) : (
          <View style={{ width: 16 }} />
        )}

        {/* Favicon */}
        {faviconUrl ? (
          <Image source={{ uri: faviconUrl }} style={styles.favicon} />
        ) : (
          <Ionicons name="globe-outline" size={16} color={colors.mutedForeground} />
        )}

        {/* Title & Domain */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {article.title}
          </Text>
          <Text style={[styles.domain, { color: colors.mutedForeground }]} numberOfLines={1}>
            {article.domain}
          </Text>
        </View>

        {/* Friend avatar */}
        {isFriend && (
          <>
            {(article as FriendBookmarkArticle).owner.picture ? (
              <Image
                source={{ uri: (article as FriendBookmarkArticle).owner.picture! }}
                style={styles.ownerAvatar}
              />
            ) : (
              <View style={[styles.ownerAvatar, styles.ownerAvatarFallback, { backgroundColor: colors.muted }]}>
                <Text style={{ fontSize: 8, color: colors.mutedForeground }}>{getOwnerInitials()}</Text>
              </View>
            )}
          </>
        )}

        {/* Category pill */}
        {categoryLabel && (
          <View style={[styles.categoryPill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.categoryText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {categoryLabel}
            </Text>
          </View>
        )}

        {/* Read status */}
        {isBookmark && (
          <View
            style={[
              styles.readDot,
              {
                backgroundColor: (article as BookmarkArticle).is_read
                  ? colors.success
                  : colors.warning,
              },
            ]}
          />
        )}

        {/* Similarity score */}
        {isBookmark && (article as BookmarkArticle).similarity_score && (
          <Text style={[styles.score, { color: colors.info }]}>
            {((article as BookmarkArticle).similarity_score! * 100).toFixed(0)}%
          </Text>
        )}

        {/* Feed saved indicator */}
        {isFeed && (article as FeedArticle).is_saved && (
          <Ionicons name="bookmark" size={14} color={colors.success} />
        )}

        {/* 3-dot menu */}
        <Pressable onPress={openMenu} hitSlop={8} style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Expanded Content */}
      {isExpanded && hasExpandableContent && (
        <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
          {article.description && (
            <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={3}>
              {article.description}
            </Text>
          )}

          {/* Tags */}
          {isEditingTags ? (
            <View style={styles.tagsRow}>
              <Ionicons name="pricetag-outline" size={14} color={colors.mutedForeground} />
              {editedTags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '1A' }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                  <Pressable onPress={() => removeTag(tag)} hitSlop={4}>
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.tagInputRow}>
                <TextInput
                  value={newTagInput}
                  onChangeText={setNewTagInput}
                  onSubmitEditing={addTag}
                  placeholder="Add tag..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.tagInput, { color: colors.foreground, borderColor: colors.border }]}
                  returnKeyType="done"
                  autoFocus
                />
                {isSavingTags ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Pressable onPress={addTag} disabled={!newTagInput.trim()}>
                    <Ionicons
                      name="add"
                      size={18}
                      color={newTagInput.trim() ? colors.primary : colors.mutedForeground}
                    />
                  </Pressable>
                )}
              </View>
              <Pressable onPress={() => { setIsEditingTags(false); setNewTagInput(''); }}>
                <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.tagsRow}>
              <Ionicons name="pricetag-outline" size={14} color={colors.mutedForeground} />
              {article.tags && article.tags.length > 0 ? (
                article.tags.slice(0, 5).map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => onTagClick?.(tag)}
                    style={[styles.tag, { backgroundColor: colors.primary + '1A' }]}
                  >
                    <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={[styles.noTags, { color: colors.mutedForeground }]}>No tags</Text>
              )}
              {isBookmark && onUpdateTags && (
                <Pressable onPress={startEditingTags} hitSlop={8}>
                  <Ionicons name="pencil" size={12} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          )}

          {/* Meta info */}
          <View style={styles.metaRow}>
            {displayDate && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {formatRelativeDate(displayDate)}
                </Text>
              </View>
            )}
            {isFeed && (article as FeedArticle).source_type && (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                via {(article as FeedArticle).source_type === 'hn' ? 'Hacker News' : 'RSS'}
              </Text>
            )}
            {isFriend && (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                by{' '}
                {(article as FriendBookmarkArticle).owner.name ||
                  (article as FriendBookmarkArticle).owner.email}
              </Text>
            )}
          </View>
        </View>
      )}
    </Pressable>

      {/* Action Menu Modal */}
      <BottomModal visible={showMenu} onClose={() => setShowMenu(false)}>
        <View style={styles.menuModal}>
          <Text style={[styles.menuTitle, { color: colors.foreground }]} numberOfLines={1}>
            {article.title}
          </Text>
          <Text style={[styles.menuDomain, { color: colors.mutedForeground }]}>
            {article.domain}
          </Text>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          {getMenuItems().map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                setShowMenu(false);
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: colors.muted },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.destructive ? colors.destructive : colors.foreground}
              />
              <Text
                style={[
                  styles.menuItemText,
                  { color: item.destructive ? colors.destructive : colors.foreground },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={() => setShowMenu(false)}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: colors.muted },
            ]}
          >
            <Text style={[styles.menuCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </BottomModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  domain: {
    fontSize: 11,
    marginTop: 1,
  },
  ownerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  ownerAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 100,
  },
  categoryText: {
    fontSize: 11,
  },
  readDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  score: {
    fontSize: 12,
    fontWeight: '500',
  },
  menuBtn: {
    padding: 4,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    marginLeft: 24,
    borderTopWidth: 1,
    gap: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
  },
  noTags: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 100,
  },
  tagInput: {
    flex: 1,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
  },
  doneText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  menuModal: {
    paddingBottom: 32,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 2,
  },
  menuDomain: {
    fontSize: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
  },
  menuCancelText: {
    fontSize: 15,
    textAlign: 'center',
    flex: 1,
  },
});
