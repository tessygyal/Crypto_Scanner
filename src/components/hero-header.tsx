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
 * The navy header at the top of each tab (and the sign-in screen). It also
 * fills the area behind the status bar, so the status bar uses light text.
 */
export function HeroHeader({ icon, logo, title, subtitle }: HeroProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-hero px-lg pb-lg"
      // The status-bar inset is only known at runtime.
      style={{ paddingTop: insets.top + spacing.md }}>
      <View className="w-full max-w-content flex-row items-center gap-md self-center">
        {logo ? (
          // Decorative: the title next to it already names the app.
          <Image
            source={logo}
            style={{ width: 64, height: 64, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
            contentFit="cover"
            accessible={false}
            importantForAccessibility="no"
          />
        ) : (
          <View
            className="h-12 w-12 items-center justify-center rounded-pill bg-on-hero/10"
            importantForAccessibility="no-hide-descendants">
            <Ionicons name={icon} size={26} color={theme.onHero} />
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <ThemedText variant="heading" color="onHero" accessibilityRole="header">
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText variant="small" color="heroMuted">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </View>
  );
}
