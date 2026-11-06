import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { useTheme } from '@/hooks/use-theme';
import { maxContentWidth, spacing } from '@/theme';

/**
 * Scrollable, safe-area-aware page with a readable max width.
 * Shows the offline banner at the top while the phone is offline.
 * Set `hasHeader` when a navigation header already covers the status bar.
 */
export function Screen({ children, hasHeader }: { children: ReactNode; hasHeader?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingTop: (hasHeader ? 0 : insets.top) + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}>
      <View style={styles.inner}>
        <OfflineBanner />
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  inner: {
    width: '100%',
    maxWidth: maxContentWidth,
    gap: spacing.lg,
  },
});
