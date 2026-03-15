import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useBookmarkApi } from '../hooks/useBookmarkApi';
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
    try {
      const data = await bookmarkApi.previewBookmark(url.trim());
      setPreview(data);
      setCategory(data.suggested_category);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to preview URL');
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
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add Bookmark</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* URL Input */}
            <View style={styles.urlRow}>
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="Enter URL..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!preview}
              />
              <Pressable onPress={handlePaste} style={[styles.iconBtn, { borderColor: colors.border }]}>
                <Ionicons name="clipboard-outline" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {!preview && (
              <Pressable
                onPress={handlePreview}
                disabled={loading || !url.trim()}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: loading || !url.trim() ? colors.muted : colors.primary },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Preview</Text>
                )}
              </Pressable>
            )}

            {/* Preview */}
            {preview && (
              <View style={[styles.previewCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.previewTitle, { color: colors.foreground }]}>
                  {preview.title || 'Untitled'}
                </Text>
                {preview.description && (
                  <Text style={[styles.previewDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {preview.description}
                  </Text>
                )}
                <Text style={[styles.previewDomain, { color: colors.mutedForeground }]}>
                  {preview.domain}
                </Text>

                {preview.tags.length > 0 && (
                  <View style={styles.previewTags}>
                    {preview.tags.map((tag) => (
                      <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '1A' }]}>
                        <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Category */}
                <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="Category"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                />

                {/* Reference */}
                <Text style={[styles.label, { color: colors.foreground }]}>Reference (optional)</Text>
                <TextInput
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Why are you saving this?"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.border }]}
                  multiline
                  numberOfLines={2}
                />

                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.primaryBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                      Add Bookmark
                    </Text>
                  )}
                </Pressable>

                <Pressable onPress={reset}>
                  <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {error ? (
              <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  iconBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  previewDomain: {
    fontSize: 12,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
  },
});
