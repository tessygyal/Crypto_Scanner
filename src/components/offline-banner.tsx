import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useIsOnline } from '@/hooks/use-is-online';
import { useTheme } from '@/hooks/use-theme';
import { OFFLINE_BANNER_TEXT } from '@/utils/offline';

/** Shown at the top of every screen while the phone is offline. Icon + text, not color alone. */
export function OfflineBanner() {
  const theme = useTheme();
  const online = useIsOnline();
  if (online) return null;
  return (
    <View
      className="flex-row items-center gap-sm border rounded-md py-sm px-md bg-surface border-border"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={18} color={theme.text} />
      <ThemedText variant="small" className="flex-1">
        {OFFLINE_BANNER_TEXT}
      </ThemedText>
    </View>
  );
}
