import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** A small outlined pill button with an icon, for quick actions (paste, scan, examples). */
export function ActionChip({
  label,
  icon,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      className="min-h-12 max-w-full flex-row items-center gap-sm rounded-pill border-2 border-border bg-background px-md active:scale-[0.97] active:opacity-80">
      {icon && <Ionicons name={icon} size={18} color={theme.primary} importantForAccessibility="no" />}
      <ThemedText variant="smallBold" numberOfLines={1} className="shrink">
        {label}
      </ThemedText>
    </Pressable>
  );
}
