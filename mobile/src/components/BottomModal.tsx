import React from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface BottomModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomModal({ visible, onClose, children }: BottomModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.content, { backgroundColor: colors.card, borderColor: colors.border }]}
          onStartShouldSetResponder={() => true}
        >
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
});
