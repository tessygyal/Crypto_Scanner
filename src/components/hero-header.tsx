import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, type ImageSource } from 'expo-image';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';

export type HeroProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Show this image (e.g. the app icon) instead of `icon`, a little larger. */
  logo?: ImageSource | number;
  title: string;
  subtitle?: string;
};

/**
 * The header at the top of each tab (and the sign-in screen): an icon in a
 * lavender circle, then a big bold title and a short subtitle, sitting flat on
 * the page colour. It also fills the area behind the status bar.
 */
export function HeroHeader({ icon, logo, title, subtitle }: HeroProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-hero px-lg pb-sm"
      // The status-bar inset is only known at runtime.
      style={{ paddingTop: insets.top + spacing.md }}>
      <View className="w-full max-w-content gap-sm self-center">
        {logo ? (
          // Decorative: the title next to it already names the app.
          <Image
            source={logo}
            style={{ width: 64, height: 64, borderRadius: 16 }}
            contentFit="cover"
            accessible={false}
            importantForAccessibility="no"
          />
        ) : (
          <View
            className="h-11 w-11 items-center justify-center rounded-pill bg-surface"
            importantForAccessibility="no-hide-descendants">
            <Ionicons name={icon} size={22} color={theme.primary} />
          </View>
        )}
        <ThemedText variant="title" color="onHero" accessibilityRole="header">
          {title}
        </ThemedText>
        {subtitle ? <ThemedText color="heroMuted">{subtitle}</ThemedText> : null}
      </View>
    </View>
  );
}
