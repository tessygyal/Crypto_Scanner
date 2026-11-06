import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the full width of the container (e.g. form submit buttons). */
  fullWidth?: boolean;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, fullWidth }: ButtonProps) {
  const theme = useTheme();
  const filled = variant !== 'secondary';
  const fill = variant === 'danger' ? theme.danger : theme.primary;
  const textColor = variant === 'danger' ? theme.onDanger : filled ? theme.onPrimary : theme.text;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        filled
          ? { backgroundColor: fill }
          : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
        fullWidth && styles.fullWidth,
        (pressed || inactive) && styles.dimmed,
      ]}>
      {loading && <ActivityIndicator color={textColor} />}
      <ThemedText variant="bodyBold" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  dimmed: {
    opacity: 0.6,
  },
});
