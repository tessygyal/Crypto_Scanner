import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/async-state';
import { HeroHeader } from '@/components/hero-header';
import { Button } from '@/components/button';
import { HistoryRow } from '@/components/history/history-row';
import { OfflineBanner } from '@/components/offline-banner';
import { useCheckHistory } from '@/hooks/use-history';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { isOfflineWithoutData } from '@/utils/offline';

export default function HistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const history = useCheckHistory();
  const checks = history.data?.pages.flatMap((p) => p.checks) ?? [];
  const isEmpty = history.isSuccess && checks.length === 0;

  return (
    <View className="flex-1 bg-background">
      <HeroHeader icon="time" title="History" subtitle="Your past checks. Tap one to view, re-run or delete it." />
      <FlatList
        className="flex-1"
      contentContainerClassName="px-lg"
      // Safe-area insets are only known at runtime, so they stay as a style.
      contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      data={history.isSuccess ? checks : []}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <View className="w-full max-w-content self-center mb-sm">
          <HistoryRow
            check={item}
            onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}
          />
        </View>
      )}
      ListHeaderComponent={
        <View className="w-full max-w-content self-center gap-md mb-md">
          <OfflineBanner />
          {!history.isSuccess && (
            <AsyncState
              isLoading={history.isLoading}
              error={history.error}
              isOffline={isOfflineWithoutData(history)}
              loadingMessage="Loading your history…"
              onRetry={() => history.refetch()}
              isRetrying={history.isFetching}>
              {null}
            </AsyncState>
          )}
          {isEmpty && (
            <AsyncState isLoading={false} error={null} isEmpty emptyTitle="No checks yet" emptyMessage="Checks you run are saved here.">
              {null}
            </AsyncState>
          )}
          {isEmpty && <Button label="Check a link" onPress={() => router.navigate('/check')} />}
        </View>
      }
      ListFooterComponent={
        history.hasNextPage || history.isFetchingNextPage ? (
          <View className="py-md items-center">
            {history.isFetchingNextPage ? (
              <ActivityIndicator color={theme.textSecondary} accessibilityLabel="Loading more checks" />
            ) : (
              <Button label="Load more" variant="secondary" onPress={() => history.fetchNextPage()} />
            )}
          </View>
        ) : undefined
      }
      onEndReached={() => {
        if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={history.isRefetching && !history.isFetchingNextPage}
          onRefresh={() => {
            history.refetch();
          }}
          tintColor={theme.textSecondary}
        />
      }
      />
    </View>
  );
}
