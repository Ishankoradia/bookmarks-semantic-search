import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useFollowApi } from '../hooks/useFollowApi';
import { UserCard } from './UserCard';
import { FollowButton } from './FollowButton';
import type { UserProfileResponse } from '../types/api';

interface UserSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onUserFollowed?: () => void;
}

export function UserSearchSheet({ visible, onClose, onUserFollowed }: UserSearchSheetProps) {
  const { colors } = useTheme();
  const followApi = useFollowApi();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      setLoading(true);
      try {
        const data = await followApi.searchUsers(q);
        setResults(data);
        setHasSearched(true);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [followApi]
  );

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 300);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    onClose();
  };

  const refreshResults = () => {
    if (query.length >= 2) search(query);
    onUserFollowed?.();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Find People to Follow</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={[styles.searchRow, { borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={handleChangeText}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : hasSearched && results.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No users found
            </Text>
          ) : !hasSearched ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Enter at least 2 characters to search
            </Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.uuid}
              renderItem={({ item }) => (
                <UserCard
                  user={item}
                  action={
                    <FollowButton
                      userUuid={item.uuid}
                      initialStatus={item.follow_request_status}
                      followRequestId={item.follow_request_id}
                      onStatusChange={refreshResults}
                    />
                  }
                />
              )}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}
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
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  loader: {
    marginTop: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
