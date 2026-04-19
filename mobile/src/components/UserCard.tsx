import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getInitials } from '../lib/utils';
import type { UserSummary, UserProfileResponse } from '../types/api';

interface UserCardProps {
  user: UserSummary | UserProfileResponse;
  showStats?: boolean;
  action?: React.ReactNode;
}

export function UserCard({ user, showStats = false, action }: UserCardProps) {
  const { colors } = useTheme();

  const profileUser = user as UserProfileResponse;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.muted }]}>
            <Text style={[styles.initials, { color: colors.mutedForeground }]}>
              {getInitials(user.name, user.email)}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {user.name || user.email}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
            {user.email}
          </Text>
          {showStats && profileUser.followers_count !== undefined && (
            <Text style={[styles.stats, { color: colors.mutedForeground }]}>
              {profileUser.followers_count} followers{' '}
              {profileUser.following_count} following
            </Text>
          )}
        </View>
        {action && <View style={styles.action}>{action}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 14,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  email: {
    fontSize: 12,
    marginTop: 1,
  },
  stats: {
    fontSize: 12,
    marginTop: 2,
  },
  action: {
    flexShrink: 0,
  },
});
