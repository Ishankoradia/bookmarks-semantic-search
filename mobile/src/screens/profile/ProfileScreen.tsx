import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Switch,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../lib/utils';
import { usePreferencesApi } from '../../hooks/usePreferencesApi';
import { TopicSelector } from '../../components/TopicSelector';
import { BottomModal } from '../../components/BottomModal';
import type { UserPreference } from '../../types/api';

export function ProfileScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const preferencesApi = usePreferencesApi();

  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

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
    // Optimistic update
    const previous = preferences;
    setPreferences((prev) => prev ? { ...prev, is_discoverable: value } : prev);
    try {
      await preferencesApi.updatePreferences({ is_discoverable: value });
    } catch {
      // Revert on failure
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

  const handleSignOut = () => {
    setShowSignOut(true);
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
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile</Text>

      {/* User Info Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {user?.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.muted }]}>
            <Text style={[styles.avatarText, { color: colors.mutedForeground }]}>
              {getInitials(user?.name || null, user?.email || '?')}
            </Text>
          </View>
        )}
        <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name}</Text>
        <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
      </View>

      {/* Discoverability */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="eye-outline" size={18} color={colors.foreground} />
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>
              Allow others to find me
            </Text>
          </View>
          <Switch
            value={preferences?.is_discoverable ?? false}
            onValueChange={handleToggleDiscoverability}
            trackColor={{ false: colors.muted, true: colors.primary + '80' }}
            thumbColor={preferences?.is_discoverable ? colors.primary : colors.mutedForeground}
          />
        </View>
        <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
          When enabled, other users can find you by searching for your name or email.
        </Text>
      </View>

      {/* Interests */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Interests</Text>
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
              Topics for your Explore feed
            </Text>
          </View>
          {!editingInterests && (
            <Pressable onPress={() => setEditingInterests(true)}>
              <Ionicons name="pencil" size={18} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {editingInterests ? (
          <View style={styles.editSection}>
            <TopicSelector
              topics={topics}
              selected={selectedInterests}
              onToggle={(topic) =>
                setSelectedInterests((prev) =>
                  prev.includes(topic)
                    ? prev.filter((t) => t !== topic)
                    : [...prev, topic]
                )
              }
              minimum={1}
            />
            <View style={styles.editActions}>
              <Pressable
                onPress={() => {
                  setSelectedInterests(preferences?.interests || []);
                  setEditingInterests(false);
                }}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveInterests}
                disabled={savingInterests || selectedInterests.length === 0}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      savingInterests || selectedInterests.length === 0
                        ? colors.muted
                        : colors.primary,
                  },
                ]}
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
                <View
                  key={interest}
                  style={[styles.interestPill, { backgroundColor: colors.primary + '1A' }]}
                >
                  <Text style={[styles.interestText, { color: colors.primary }]}>{interest}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noInterests, { color: colors.mutedForeground }]}>
                No interests selected
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Sign Out */}
      <Pressable
        onPress={handleSignOut}
        style={[styles.signOutBtn, { borderColor: colors.border }]}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
      </Pressable>
    </ScrollView>

      <BottomModal visible={showSignOut} onClose={() => setShowSignOut(false)}>
        <View style={styles.signOutModal}>
          <Ionicons name="log-out-outline" size={32} color={colors.destructive} />
          <Text style={[styles.signOutModalTitle, { color: colors.foreground }]}>Sign Out</Text>
          <Text style={[styles.signOutModalDesc, { color: colors.mutedForeground }]}>
            Are you sure you want to sign out?
          </Text>
          <Pressable
            onPress={() => {
              setShowSignOut(false);
              signOut();
            }}
            style={[styles.signOutConfirmBtn, { borderColor: colors.destructive }]}
          >
            <Text style={[styles.signOutConfirmText, { color: colors.destructive }]}>Sign Out</Text>
          </Pressable>
          <Pressable onPress={() => setShowSignOut(false)} style={styles.signOutCancelBtn}>
            <Text style={[styles.signOutCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </BottomModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  editSection: {
    gap: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  interestPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noInterests: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '500',
  },
  signOutModal: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 32,
    gap: 8,
  },
  signOutModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  signOutModalDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  signOutConfirmBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  signOutConfirmText: {
    fontSize: 15,
    fontWeight: '600',
  },
  signOutCancelBtn: {
    paddingVertical: 10,
  },
  signOutCancelText: {
    fontSize: 15,
  },
});
