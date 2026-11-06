import { ActivityIndicator, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the full width of the container (e.g. form submit buttons). */
  fullWidth?: boolean;
};

const BOX = {
  primary: 'bg-primary',
  secondary: 'border border-border bg-surface',
  danger: 'bg-danger',
} as const;

const TEXT = { primary: 'onPrimary', secondary: 'text', danger: 'onDanger' } as const;

export function Button({ label, onPress, variant = 'primary', loading, disabled, fullWidth }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={cn(
        'min-h-12 flex-row items-center justify-center gap-sm rounded-md px-lg active:opacity-60',
        BOX[variant],
        fullWidth ? 'self-stretch' : 'self-start',
        inactive && 'opacity-60'
      )}>
      {loading && <ActivityIndicator color={theme[TEXT[variant]]} />}
      <ThemedText variant="bodyBold" color={TEXT[variant]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
