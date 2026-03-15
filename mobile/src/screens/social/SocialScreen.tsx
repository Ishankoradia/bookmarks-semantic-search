import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useFollowApi } from '../../hooks/useFollowApi';
import { UserCard } from '../../components/UserCard';
import { FollowRequestCard } from '../../components/FollowRequestCard';
import { UserSearchSheet } from '../../components/UserSearchSheet';
import { EmptyState } from '../../components/EmptyState';
import type { UserSummary, FollowRequest } from '../../types/api';

type Tab = 'following' | 'followers' | 'requests';

export function SocialScreen() {
  const { colors } = useTheme();
  const followApi = useFollowApi();
  const [searchVisible, setSearchVisible] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('following');
  const [following, setFollowing] = useState<UserSummary[]>([]);
  const [followers, setFollowers] = useState<UserSummary[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FollowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const [followingRes, followersRes, receivedRes, sentRes] = await Promise.all([
        followApi.getFollowing(),
        followApi.getFollowers(),
        followApi.getReceivedPendingRequests(),
        followApi.getSentPendingRequests(),
      ]);
      setFollowing(followingRes.users);
      setFollowers(followersRes.users);
      setReceivedRequests(receivedRes.requests);
      setSentRequests(sentRes.requests);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, []);

  const handleUnfollow = async (uuid: string) => {
    await followApi.unfollow(uuid);
    setFollowing((prev) => prev.filter((u) => u.uuid !== uuid));
  };

  const handleRemoveFollower = async (uuid: string) => {
    await followApi.removeFollower(uuid);
    setFollowers((prev) => prev.filter((u) => u.uuid !== uuid));
  };

  const handleRespondRequest = async (requestId: number, status: 'accepted' | 'rejected') => {
    await followApi.respondToRequest(requestId, status);
    setReceivedRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (status === 'accepted') loadAll();
  };

  const handleCancelRequest = async (requestId: number) => {
    await followApi.cancelRequest(requestId);
    setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'following', label: 'Following' },
    { key: 'followers', label: 'Followers' },
    { key: 'requests', label: 'Requests', badge: receivedRequests.length },
  ];

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />;
    }

    switch (activeTab) {
      case 'following':
        return following.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Not following anyone yet"
            description="Find people to follow and see their bookmarks"
            actionLabel="Find People"
            onAction={() => setSearchVisible(true)}
          />
        ) : (
          <FlatList
            data={following}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => (
              <UserCard
                user={item}
                action={
                  <Pressable
                    onPress={() => handleUnfollow(item.uuid)}
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.actionText, { color: colors.foreground }]}>Unfollow</Text>
                  </Pressable>
                }
              />
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        );

      case 'followers':
        return followers.length === 0 ? (
          <EmptyState icon="person-outline" title="No followers yet" />
        ) : (
          <FlatList
            data={followers}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => (
              <UserCard
                user={item}
                action={
                  <Pressable
                    onPress={() => handleRemoveFollower(item.uuid)}
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.actionText, { color: colors.destructive }]}>Remove</Text>
                  </Pressable>
                }
              />
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        );

      case 'requests':
        const hasRequests = receivedRequests.length > 0 || sentRequests.length > 0;
        return !hasRequests ? (
          <EmptyState icon="mail-outline" title="No pending requests" />
        ) : (
          <FlatList
            data={[
              ...receivedRequests.map((r) => ({ ...r, _type: 'received' as const })),
              ...sentRequests.map((r) => ({ ...r, _type: 'sent' as const })),
            ]}
            keyExtractor={(item) => `${item._type}-${item.id}`}
            renderItem={({ item }) => (
              <FollowRequestCard
                request={item}
                type={item._type}
                onRespond={handleRespondRequest}
                onCancel={handleCancelRequest}
              />
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListHeaderComponent={
              receivedRequests.length > 0 && sentRequests.length > 0 ? (
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  Received Requests
                </Text>
              ) : null
            }
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Social</Text>
        <Pressable
          onPress={() => setSearchVisible(true)}
          style={[styles.findBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="person-add-outline" size={16} color={colors.primaryForeground} />
          <Text style={[styles.findBtnText, { color: colors.primaryForeground }]}>Find People</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? colors.primary : colors.mutedForeground },
              ]}
            >
              {tab.label}
            </Text>
            {tab.badge !== undefined && tab.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {renderContent()}

      <UserSearchSheet
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onUserFollowed={loadAll}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  findBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
