import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { OFFLINE_NO_DATA_MESSAGE, OFFLINE_NO_DATA_TITLE } from '@/utils/offline';

export type AsyncStateProps = {
  isLoading: boolean;
  error: Error | null;
  /** True when the phone is offline and nothing is cached yet (see isOfflineWithoutData). */
  isOffline?: boolean;
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
 * One place that renders the states every API call must handle:
 * loading, error (with retry), offline with nothing cached, empty, and success.
 */
export function AsyncState({
  isLoading,
  error,
  isOffline,
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
      <View className="flex-row items-center gap-sm" accessibilityLiveRegion="polite">
        <ActivityIndicator color={theme.textSecondary} />
        <ThemedText color="textSecondary">{loadingMessage}</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View
        className="border rounded-md p-md gap-sm border-danger"
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive">
        <ThemedText variant="bodyBold" color="danger">
          Something went wrong
        </ThemedText>
        <ThemedText color="textSecondary">{error.message}</ThemedText>
        {onRetry && <Button label="Try again" variant="secondary" onPress={onRetry} loading={isRetrying} />}
      </View>
    );
  }

  if (isOffline) {
    return (
      <View className="border rounded-md p-md gap-sm border-border" accessibilityLiveRegion="polite">
        <View className="flex-row items-center gap-sm">
          <Ionicons name="cloud-offline-outline" size={18} color={theme.text} />
          <ThemedText variant="bodyBold">{OFFLINE_NO_DATA_TITLE}</ThemedText>
        </View>
        <ThemedText color="textSecondary">{OFFLINE_NO_DATA_MESSAGE}</ThemedText>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className="border rounded-md p-md gap-sm border-border">
        <ThemedText variant="bodyBold">{emptyTitle}</ThemedText>
        {emptyMessage && <ThemedText color="textSecondary">{emptyMessage}</ThemedText>}
      </View>
    );
  }

  return <>{children}</>;
}
