import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { HistoryRow } from '@/components/history/history-row';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { useCheckHistory } from '@/hooks/use-history';
import { useTheme } from '@/hooks/use-theme';
import { maxContentWidth, spacing } from '@/theme';
import { isOfflineWithoutData } from '@/utils/offline';

export default function HistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const history = useCheckHistory();
  const checks = history.data?.pages.flatMap((p) => p.checks) ?? [];
  const isEmpty = history.isSuccess && checks.length === 0;

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      data={history.isSuccess ? checks : []}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <HistoryRow
            check={item}
            onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}
          />
        </View>
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <ThemedText variant="title">History</ThemedText>
          <ThemedText color="textSecondary">Your past checks. Tap one to view, re-run or delete it.</ThemedText>
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
          <View style={styles.footer}>
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
  );
}

const styles = StyleSheet.create({
  // Cells stretch to the full list width; each child is then capped and centred.
  // (Centring the whole container would size each row to its own text.)
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  item: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
