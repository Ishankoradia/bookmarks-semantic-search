import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useBookmarkApi } from '../hooks/useBookmarkApi';
import { BottomModal } from './BottomModal';
import type { BookmarkPreviewResponse } from '../types/api';

interface AddBookmarkSheetProps {
  visible: boolean;
  onClose: () => void;
  onBookmarkAdded: () => void;
}

export function AddBookmarkSheet({ visible, onClose, onBookmarkAdded }: AddBookmarkSheetProps) {
  const { colors } = useTheme();
  const bookmarkApi = useBookmarkApi();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<BookmarkPreviewResponse | null>(null);
  const [category, setCategory] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setUrl('');
    setPreview(null);
    setCategory('');
    setReference('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text);
  };

  const handlePreview = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const data = await bookmarkApi.previewBookmark(url.trim());
      setPreview(data);
      setCategory(data.suggested_category);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'Failed to preview URL');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    setError('');
    try {
      await bookmarkApi.saveBookmark({
        id: preview.id,
        category: category || preview.suggested_category,
        reference: reference || undefined,
        title: preview.scrape_failed ? preview.title || url : undefined,
      });
      handleClose();
      onBookmarkAdded();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to save bookmark');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomModal visible={visible} onClose={handleClose}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>Add Bookmark</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Enter the URL you want to save
        </Text>

        {/* URL */}
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>URL</Text>
        <View style={styles.urlRow}>
          <TextInput
            value={url}
            onChangeText={(text) => {
              setUrl(text);
              if (preview) {
                setPreview(null);
                setCategory('');
                setReference('');
                setError('');
              }
            }}
            placeholder="https://example.com"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.urlInput, { color: colors.foreground, borderColor: colors.border }]}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={handlePreview}
            returnKeyType="go"
            autoFocus={false}
          />
          <Pressable onPress={handlePaste} style={[styles.pasteBtn, { borderColor: colors.border }]}>
            <Ionicons name="clipboard-outline" size={16} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={handlePreview}
            disabled={loading || !url.trim()}
            style={[
              styles.previewBtn,
              { backgroundColor: loading || !url.trim() ? colors.muted : colors.card, borderColor: colors.border },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.foreground} size="small" />
            ) : (
              <Text style={[styles.previewBtnText, { color: colors.foreground }]}>Preview</Text>
            )}
          </Pressable>
        </View>

        {/* Preview card */}
        {preview && (
          <View style={[styles.previewCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.previewTitle, { color: colors.foreground }]} numberOfLines={2}>
              {preview.title || 'Untitled'}
            </Text>
            <Text style={[styles.previewDomain, { color: colors.mutedForeground }]}>
              {preview.domain}
            </Text>
          </View>
        )}

        {/* Category */}
        {preview && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Category"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
            />
            {preview.suggested_category ? (
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                AI suggested: {preview.suggested_category}
              </Text>
            ) : null}
          </>
        )}

        {/* Reference */}
        {preview && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 8 }]}>
              Reference (optional)
            </Text>
            <TextInput
              value={reference}
              onChangeText={setReference}
              placeholder="Who shared this? Where did you find it?"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
            />
          </>
        )}

        {error ? (
          <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
        ) : null}

        {/* Add Bookmark button */}
        {preview && (
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Add Bookmark</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  pasteBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  previewBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  previewBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 2,
    marginTop: 4,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewDomain: {
    fontSize: 12,
  },
  fieldInput: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  fieldHint: {
    fontSize: 12,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
