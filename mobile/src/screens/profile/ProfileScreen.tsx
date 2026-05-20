import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Switch,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../lib/utils';
import { usePreferencesApi } from '../../hooks/usePreferencesApi';
import { useAccountApi } from '../../hooks/useAccountApi';
import { TopicSelector } from '../../components/TopicSelector';
import { BottomModal } from '../../components/BottomModal';
import type { UserPreference } from '../../types/api';

type FeedbackType = 'feedback' | 'bug' | 'feature';

export function ProfileScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const preferencesApi = usePreferencesApi();
  const accountApi = useAccountApi();

  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);

  // Feedback state
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feedback');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProfile = async () => {
    try {
      const [prefs, topicsList] = await Promise.all([
        preferencesApi.getPreferences(),
        preferencesApi.getTopics(),
      ]);
      setPreferences(prefs);
      setTopics(topicsList);
      setSelectedInterests(prefs.interests || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleToggleDiscoverability = async (value: boolean) => {
    const previous = preferences;
    setPreferences((prev) => prev ? { ...prev, is_discoverable: value } : prev);
    try {
      await preferencesApi.updatePreferences({ is_discoverable: value });
    } catch {
      setPreferences(previous);
    }
  };

  const handleSaveInterests = async () => {
    setSavingInterests(true);
    try {
      const updated = await preferencesApi.updatePreferences({ interests: selectedInterests });
      setPreferences(updated);
      setEditingInterests(false);
    } catch {
      Alert.alert('Error', 'Failed to save interests');
    } finally {
      setSavingInterests(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setSendingFeedback(true);
    try {
      await accountApi.submitFeedback(feedbackType, feedbackMessage.trim());
      Alert.alert('Thank you!', 'Your feedback has been submitted.');
      setFeedbackMessage('');
    } catch {
      Alert.alert('Error', 'Failed to send feedback');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteReason.trim()) return;
    setIsDeleting(true);
    try {
      await accountApi.deleteAccount(deleteReason.trim());
      setShowDeleteModal(false);
      signOut();
    } catch {
      Alert.alert('Error', 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* User Header */}
        <View style={styles.userHeader}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.muted }]}>
              <Text style={[styles.avatarText, { color: colors.mutedForeground }]}>
                {getInitials(user?.name || null, user?.email || '?')}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>{user?.name}</Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user?.email}</Text>
          </View>
          <Pressable
            onPress={signOut}
            style={[styles.signOutBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.foreground} />
            <Text style={[styles.signOutText, { color: colors.foreground }]}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Discoverability */}
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Allow others to find me</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Others can search your name or email</Text>
              </View>
              <Switch
                value={preferences?.is_discoverable ?? false}
                onValueChange={handleToggleDiscoverability}
                trackColor={{ false: colors.muted, true: colors.primary + '80' }}
                thumbColor={preferences?.is_discoverable ? colors.primary : colors.mutedForeground}
              />
            </View>

            {/* Interests */}
            <View style={styles.interestsSection}>
              <View style={styles.interestsHeader}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Interests</Text>
                {!editingInterests && (
                  <Pressable onPress={() => { setSelectedInterests(preferences?.interests || []); setEditingInterests(true); }}>
                    <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
                  </Pressable>
                )}
              </View>
              {editingInterests ? (
                <View style={{ gap: 12 }}>
                  <TopicSelector
                    topics={topics}
                    selected={selectedInterests}
                    onToggle={(topic) =>
                      setSelectedInterests((prev) =>
                        prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
                      )
                    }
                    minimum={1}
                  />
                  <View style={styles.editActions}>
                    <Pressable
                      onPress={() => setEditingInterests(false)}
                      style={[styles.cancelBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveInterests}
                      disabled={savingInterests || selectedInterests.length === 0}
                      style={[styles.saveBtn, { backgroundColor: savingInterests ? colors.muted : colors.primary }]}
                    >
                      {savingInterests ? (
                        <ActivityIndicator color={colors.primaryForeground} size="small" />
                      ) : (
                        <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.interestPills}>
                  {preferences?.interests && preferences.interests.length > 0 ? (
                    preferences.interests.map((interest) => (
                      <View key={interest} style={[styles.interestPill, { backgroundColor: colors.primary + '1A' }]}>
                        <Text style={[styles.interestText, { color: colors.primary }]}>{interest}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noData, { color: colors.mutedForeground }]}>No interests selected</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FEEDBACK</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.feedbackContent}>
              <View style={styles.feedbackTypes}>
                {(['feedback', 'bug', 'feature'] as FeedbackType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setFeedbackType(type)}
                    style={[
                      styles.feedbackPill,
                      {
                        backgroundColor: feedbackType === type ? colors.primary : 'transparent',
                        borderColor: feedbackType === type ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{
                      fontSize: 12,
                      color: feedbackType === type ? colors.primaryForeground : colors.mutedForeground,
                    }}>
                      {type === 'feedback' ? 'General' : type === 'bug' ? 'Bug Report' : 'Feature'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={feedbackMessage}
                onChangeText={setFeedbackMessage}
                placeholder={
                  feedbackType === 'bug'
                    ? 'What happened and what did you expect?'
                    : feedbackType === 'feature'
                    ? 'What feature would you like to see?'
                    : 'Share your thoughts about the application...'
                }
                placeholderTextColor={colors.mutedForeground}
                style={[styles.feedbackInput, { color: colors.foreground, borderColor: colors.border }]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Pressable
                onPress={handleSubmitFeedback}
                disabled={sendingFeedback || !feedbackMessage.trim()}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: sendingFeedback || !feedbackMessage.trim() ? 0.5 : 1,
                  },
                ]}
              >
                {sendingFeedback ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={14} color={colors.primaryForeground} />
                    <Text style={[styles.sendBtnText, { color: colors.primaryForeground }]}>Send Feedback</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.aboutRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.appIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="bookmark" size={14} color={colors.primaryForeground} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Semantic Bookmarks</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>AI-powered bookmark manager</Text>
              </View>
            </View>
            <Pressable
              onPress={() => Linking.openURL('https://chromewebstore.google.com/detail/mefbjommjlcdcllmcjdjcngjaegnelik')}
              style={[styles.aboutLink, { borderBottomColor: colors.border }]}
            >
              <Ionicons name="logo-chrome" size={16} color={colors.mutedForeground} />
              <Text style={[styles.aboutLinkText, { color: colors.foreground }]}>Chrome Extension</Text>
              <Ionicons name="open-outline" size={14} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://bookmarks.ishankoradia.in')}
              style={[styles.aboutLink, { borderBottomColor: colors.border }]}
            >
              <Ionicons name="globe-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.aboutLinkText, { color: colors.foreground }]}>Web App</Text>
              <Ionicons name="open-outline" size={14} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://bookmarks.ishankoradia.in/privacy')}
              style={styles.aboutLinkLast}
            >
              <Ionicons name="eye-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.aboutLinkText, { color: colors.foreground }]}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setShowDeleteModal(true)}
              style={styles.deleteRow}
            >
              <Ionicons name="trash-outline" size={16} color={colors.destructive} />
              <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete account and all data</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <BottomModal visible={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteReason(''); }}>
        <View style={styles.deleteModal}>
          <Text style={[styles.deleteModalTitle, { color: colors.foreground }]}>Delete your account?</Text>
          <Text style={[styles.deleteModalDesc, { color: colors.mutedForeground }]}>
            This will permanently delete your account, all bookmarks, and all data. This cannot be undone.
          </Text>
          <TextInput
            value={deleteReason}
            onChangeText={setDeleteReason}
            placeholder="Please tell us why you're leaving"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.deleteInput, { color: colors.foreground, borderColor: colors.border }]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.deleteActions}>
            <Pressable
              onPress={() => { setShowDeleteModal(false); setDeleteReason(''); }}
              style={[styles.cancelBtn, { borderColor: colors.border, flex: 1 }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteAccount}
              disabled={isDeleting || !deleteReason.trim()}
              style={[styles.deleteConfirmBtn, { backgroundColor: isDeleting || !deleteReason.trim() ? colors.muted : colors.destructive, flex: 1 }]}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.deleteConfirmText}>Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      </BottomModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 24 },

  // User Header
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '700' },
  userEmail: { fontSize: 13 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  signOutText: { fontSize: 13, fontWeight: '500' },

  // Sections
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  card: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },

  // Settings
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1 },
  settingInfo: { flex: 1, paddingRight: 12 },
  settingLabel: { fontSize: 14, fontWeight: '500' },
  settingDesc: { fontSize: 12, marginTop: 2 },

  // Interests
  interestsSection: { padding: 14, gap: 10 },
  interestsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editLink: { fontSize: 13 },
  interestPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  interestPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  interestText: { fontSize: 12, fontWeight: '500' },
  noData: { fontSize: 13, fontStyle: 'italic' },
  editActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontWeight: '500' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, minWidth: 60, alignItems: 'center' },
  saveBtnText: { fontSize: 13, fontWeight: '600' },

  // Feedback
  feedbackContent: { padding: 14, gap: 10 },
  feedbackTypes: { flexDirection: 'row', gap: 8 },
  feedbackPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  feedbackInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, minHeight: 70 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 6 },
  sendBtnText: { fontSize: 13, fontWeight: '600' },

  // About
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1 },
  appIcon: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  aboutLink: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1 },
  aboutLinkLast: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  aboutLinkText: { flex: 1, fontSize: 14 },

  // Account
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  deleteText: { fontSize: 14 },

  // Delete Modal
  deleteModal: { padding: 20, paddingBottom: 32, gap: 12 },
  deleteModalTitle: { fontSize: 17, fontWeight: '700' },
  deleteModalDesc: { fontSize: 13 },
  deleteInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, minHeight: 70 },
  deleteActions: { flexDirection: 'row', gap: 10 },
  deleteConfirmBtn: { paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  deleteConfirmText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
