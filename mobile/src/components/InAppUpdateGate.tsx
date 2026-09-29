import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import SpInAppUpdates, {
  IAUUpdateKind,
  IAUInstallStatus,
} from 'sp-react-native-in-app-updates';
import { BottomModal } from './BottomModal';
import { useTheme } from '../theme/ThemeContext';

/**
 * Soft Google Play in-app update (Android only).
 *
 * On launch, asks Play whether a newer published version is live. If so it starts a
 * FLEXIBLE update — Play shows its own (system-owned) consent sheet and downloads in
 * the background. When the download finishes we surface a themed "Update ready" sheet
 * (matching the app's design system) to restart & install.
 *
 * No-op on iOS and on non-Play builds (Expo Go / dev / sideloaded).
 */
export function InAppUpdateGate() {
  const { colors } = useTheme();
  const updaterRef = useRef<SpInAppUpdates | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const inAppUpdates = new SpInAppUpdates(__DEV__);
    updaterRef.current = inAppUpdates;

    const onStatus = (status: { status: number }) => {
      if (status.status === IAUInstallStatus.DOWNLOADED) setReady(true);
    };

    inAppUpdates
      .checkNeedsUpdate()
      .then((result) => {
        if (!result?.shouldUpdate) return;
        inAppUpdates.addStatusUpdateListener(onStatus);
        // FLEXIBLE = soft; IMMEDIATE would be a blocking, forced update.
        return inAppUpdates.startUpdate({ updateType: IAUUpdateKind.FLEXIBLE });
      })
      .catch(() => {
        // Offline, Play Services unavailable, or user dismissed — ignore silently.
      });

    return () => inAppUpdates.removeStatusUpdateListener(onStatus);
  }, []);

  const handleRestart = () => {
    setReady(false);
    updaterRef.current?.installUpdate();
  };

  return (
    <BottomModal visible={ready} onClose={() => setReady(false)}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Update ready</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          A new version has been downloaded. Restart the app to apply it.
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => setReady(false)}
            style={[styles.laterBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.laterText, { color: colors.foreground }]}>Later</Text>
          </Pressable>
          <Pressable
            onPress={handleRestart}
            style={[styles.restartBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.restartText, { color: colors.primaryForeground }]}>
              Restart
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 8, gap: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  laterBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  laterText: { fontSize: 14, fontWeight: '500' },
  restartBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  restartText: { fontSize: 14, fontWeight: '600' },
});
