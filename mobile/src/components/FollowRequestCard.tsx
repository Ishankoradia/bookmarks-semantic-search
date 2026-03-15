import React, { useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getInitials } from '../lib/utils';
import type { FollowRequest } from '../types/api';

interface FollowRequestCardProps {
  request: FollowRequest;
  type: 'received' | 'sent';
  onRespond: (requestId: number, status: 'accepted' | 'rejected') => Promise<void>;
  onCancel: (requestId: number) => Promise<void>;
}

export function FollowRequestCard({ request, type, onRespond, onCancel }: FollowRequestCardProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [handled, setHandled] = useState(false);

  const user = type === 'received' ? request.follower : request.following;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onRespond(request.id, 'accepted');
      setHandled(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onRespond(request.id, 'rejected');
      setHandled(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await onCancel(request.id);
      setHandled(true);
    } finally {
      setLoading(false);
    }
  };

  if (handled) return null;

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
          <Text style={[styles.typeText, { color: colors.mutedForeground }]}>
            {type === 'received' ? 'wants to follow you' : 'pending...'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : type === 'received' ? (
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleAccept}
            >
              <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { borderColor: colors.border, borderWidth: 1 }]}
              onPress={handleReject}
            >
              <Ionicons name="close" size={16} color={colors.foreground} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.cancelBtn, { borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
          </Pressable>
        )}
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
  typeText: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
