import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useIsOnline } from '@/hooks/use-is-online';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import { OFFLINE_BANNER_TEXT } from '@/utils/offline';

/** Shown at the top of every screen while the phone is offline. Icon + text, not color alone. */
export function OfflineBanner() {
  const theme = useTheme();
  const online = useIsOnline();
  if (online) return null;
  return (
    <View
      style={[styles.banner, { backgroundColor: theme.surface, borderColor: theme.border }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={18} color={theme.text} />
      <ThemedText variant="small" style={styles.text}>
        {OFFLINE_BANNER_TEXT}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    flex: 1,
  },
});
