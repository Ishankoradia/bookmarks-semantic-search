import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { usePreferencesApi } from '../hooks/usePreferencesApi';
import { TopicSelector } from './TopicSelector';

interface OnboardingSheetProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingSheet({ visible, onClose, onComplete }: OnboardingSheetProps) {
  const { colors } = useTheme();
  const preferencesApi = usePreferencesApi();
  const [topics, setTopics] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const data = await preferencesApi.getTopics();
        setTopics(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const toggleTopic = (topic: string) => {
    setSelected((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleSave = async () => {
    if (selected.length < 2) return;
    setSaving(true);
    setError('');
    try {
      await preferencesApi.updatePreferences({ interests: selected });
      onComplete();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '1A' }]}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome! What interests you?
          </Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            Select topics to personalize your Explore feed. You can change these later in your profile.
          </Text>

          {loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
            <TopicSelector
              topics={topics}
              selected={selected}
              onToggle={toggleTopic}
              minimum={2}
            />
          )}

          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={selected.length < 2 || saving}
            style={[
              styles.button,
              {
                backgroundColor:
                  selected.length < 2 || saving ? colors.muted : colors.primary,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Get Started</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loader: {
    marginVertical: 24,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
