import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { spacing } from '@/theme';

/**
 * Scrollable, safe-area-aware page with a readable max width.
 * Shows the offline banner at the top while the phone is offline.
 * Set `hasHeader` when a navigation header already covers the status bar.
 */
export function Screen({ children, hasHeader }: { children: ReactNode; hasHeader?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="grow items-center px-lg"
      // Safe-area insets are only known at runtime, so they stay as a style.
      contentContainerStyle={{
        paddingTop: (hasHeader ? 0 : insets.top) + spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}>
      <View className="w-full max-w-content gap-lg">
        <OfflineBanner />
        {children}
      </View>
    </ScrollView>
  );
}
