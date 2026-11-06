import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

export type AsyncStateProps = {
  isLoading: boolean;
  error: Error | null;
  /** True when the request succeeded but there is nothing to show. */
  isEmpty?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Rendered only in the success state. */
  children: ReactNode;
};

/**
 * One place that renders the four states every API call must handle:
 * loading, error (with retry), empty, and success.
 */
export function AsyncState({
  isLoading,
  error,
  isEmpty,
  loadingMessage = 'Loading…',
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  onRetry,
  isRetrying,
  children,
}: AsyncStateProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={styles.row} accessibilityLiveRegion="polite">
        <ActivityIndicator color={theme.textSecondary} />
        <ThemedText color="textSecondary">{loadingMessage}</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.box, { borderColor: theme.danger }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive">
        <ThemedText variant="bodyBold" style={{ color: theme.danger }}>
          Something went wrong
        </ThemedText>
        <ThemedText color="textSecondary">{error.message}</ThemedText>
        {onRetry && <Button label="Try again" variant="secondary" onPress={onRetry} loading={isRetrying} />}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={[styles.box, { borderColor: theme.border }]}>
        <ThemedText variant="bodyBold">{emptyTitle}</ThemedText>
        {emptyMessage && <ThemedText color="textSecondary">{emptyMessage}</ThemedText>}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
