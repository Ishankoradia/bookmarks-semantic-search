import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useFollowApi } from '../hooks/useFollowApi';
import type { FollowStatus } from '../types/api';

interface FollowButtonProps {
  userUuid: string;
  initialStatus: FollowStatus | null;
  followRequestId?: number | null;
  onStatusChange?: () => void;
}

export function FollowButton({
  userUuid,
  initialStatus,
  followRequestId,
  onStatusChange,
}: FollowButtonProps) {
  const { colors } = useTheme();
  const followApi = useFollowApi();
  const [status, setStatus] = useState<FollowStatus | null>(initialStatus);
  const [requestId, setRequestId] = useState(followRequestId ?? null);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      if (status === 'accepted') {
        await followApi.unfollow(userUuid);
        setStatus(null);
      } else if (status === 'pending' && requestId) {
        await followApi.cancelRequest(requestId);
        setStatus(null);
        setRequestId(null);
      } else {
        const req = await followApi.sendFollowRequest(userUuid);
        setStatus('pending');
        setRequestId(req.id);
      }
      onStatusChange?.();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Pressable style={[styles.button, { backgroundColor: colors.muted }]} disabled>
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      </Pressable>
    );
  }

  if (status === 'accepted') {
    return (
      <Pressable
        style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
        onPress={handlePress}
      >
        <Ionicons name="person-remove-outline" size={14} color={colors.foreground} />
        <Text style={[styles.text, { color: colors.foreground }]}>Unfollow</Text>
      </Pressable>
    );
  }

  if (status === 'pending') {
    return (
      <Pressable
        style={[styles.button, { backgroundColor: colors.secondary }]}
        onPress={handlePress}
      >
        <Ionicons name="time-outline" size={14} color={colors.secondaryForeground} />
        <Text style={[styles.text, { color: colors.secondaryForeground }]}>Pending</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={handlePress}
    >
      <Ionicons name="person-add-outline" size={14} color={colors.primaryForeground} />
      <Text style={[styles.text, { color: colors.primaryForeground }]}>Follow</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});
