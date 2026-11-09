import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroHeader, type HeroProps } from '@/components/hero-header';
import { OfflineBanner } from '@/components/offline-banner';
import { spacing } from '@/theme';

/**
 * Scrollable, safe-area-aware page with a readable max width.
 * - `hero`: the big-title header at the top (tabs and sign-in). It stays in place while the page scrolls.
 * - `hasHeader`: a navigation header already covers the status bar.
 * Shows the offline banner at the top while the phone is offline.
 */
export function Screen({ children, hasHeader, hero }: { children: ReactNode; hasHeader?: boolean; hero?: HeroProps }) {
  const insets = useSafeAreaInsets();
  const coveredTop = hasHeader || !!hero;
  return (
    <View className="flex-1 bg-background">
      {hero && <HeroHeader {...hero} />}
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="grow items-center px-lg"
        // Safe-area insets are only known at runtime, so they stay as a style.
        contentContainerStyle={{
          paddingTop: (coveredTop ? 0 : insets.top) + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}>
        <View className="w-full max-w-content gap-lg">
          <OfflineBanner />
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
