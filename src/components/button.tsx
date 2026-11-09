import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary = filled purple pill, secondary = outlined pill, danger = filled red pill. */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Optional icon before the label (decorative; the label says what the button does). */
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the full width of the container (e.g. form submit buttons). */
  fullWidth?: boolean;
};

const BOX = {
  primary: 'bg-primary',
  secondary: 'border-2 border-primary bg-transparent',
  danger: 'bg-danger',
} as const;

const TEXT = { primary: 'onPrimary', secondary: 'primary', danger: 'onDanger' } as const;

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, fullWidth }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={cn(
        // 56px tall pill with a subtle press-down.
        'min-h-14 flex-row items-center justify-center gap-sm rounded-pill px-lg active:scale-[0.97] active:opacity-80',
        BOX[variant],
        fullWidth ? 'self-stretch' : 'self-start',
        inactive && 'opacity-50'
      )}>
      {loading ? (
        <ActivityIndicator color={theme[TEXT[variant]]} />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={theme[TEXT[variant]]} importantForAccessibility="no" />
      ) : null}
      <ThemedText variant="bodyBold" color={TEXT[variant]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
