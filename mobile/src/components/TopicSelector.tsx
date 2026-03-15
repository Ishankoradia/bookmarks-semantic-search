import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface TopicSelectorProps {
  topics: string[];
  selected: string[];
  onToggle: (topic: string) => void;
  minimum?: number;
  disabled?: boolean;
}

export function TopicSelector({
  topics,
  selected,
  onToggle,
  minimum = 1,
  disabled = false,
}: TopicSelectorProps) {
  const { colors } = useTheme();

  return (
    <View>
      <View style={styles.grid}>
        {topics.map((topic) => {
          const isSelected = selected.includes(topic);
          return (
            <Pressable
              key={topic}
              onPress={() => {
                if (!disabled) onToggle(topic);
              }}
              style={[
                styles.pill,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                },
                disabled && styles.disabled,
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
              )}
              <Text
                style={[
                  styles.pillText,
                  { color: isSelected ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {topic}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text
        style={[
          styles.count,
          {
            color: selected.length >= minimum ? colors.success : colors.destructive,
          },
        ]}
      >
        {selected.length >= minimum
          ? `${selected.length} topics selected`
          : `Select at least ${minimum} topics...`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  count: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
});
