import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { OfflineBanner } from '@/components/offline-banner';
import { ReportRow } from '@/components/reports/report-row';
import { ThemedText } from '@/components/themed-text';
import { useReports } from '@/hooks/use-reports';
import { useTheme } from '@/hooks/use-theme';
import type { ReportScope } from '@/services/reports';
import { maxContentWidth, spacing } from '@/theme';
import { isOfflineWithoutData } from '@/utils/offline';

const EMPTY: Record<ReportScope, { title: string; message: string }> = {
  community: {
    title: 'No approved reports yet',
    message: 'Reports appear here after a moderator approves them.',
  },
  mine: {
    title: "You haven't reported anything yet",
    message: 'Seen a scam scheme? Report it to warn others in your community.',
  },
};

export default function ReportsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<ReportScope>('community');
  const reports = useReports(scope);
  const items = reports.data?.pages.flatMap((p) => p.reports) ?? [];
  const isEmpty = reports.isSuccess && items.length === 0;

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      data={reports.isSuccess ? items : []}
      keyExtractor={(r) => r.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <ReportRow
            report={item}
            showStatus={scope === 'mine'}
            onPress={() => router.push({ pathname: '/report/[id]', params: { id: item.id } })}
          />
        </View>
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <ThemedText variant="title">Reports</ThemedText>
          <ThemedText color="textSecondary">
            Scam schemes reported by people in PNG. Reports describe schemes and platforms, never named people.
          </ThemedText>
          <Button label="Report a scam scheme" onPress={() => router.push('/report/new')} fullWidth />

          <View style={styles.tabs} accessibilityRole="radiogroup" accessibilityLabel="Which reports to show">
            <ChoiceChip label="Community" selected={scope === 'community'} onPress={() => setScope('community')} />
            <ChoiceChip label="My reports" selected={scope === 'mine'} onPress={() => setScope('mine')} />
          </View>

          <OfflineBanner />
          {!reports.isSuccess && (
            <AsyncState
              isLoading={reports.isLoading}
              error={reports.error}
              isOffline={isOfflineWithoutData(reports)}
              loadingMessage="Loading reports…"
              onRetry={() => reports.refetch()}
              isRetrying={reports.isFetching}>
              {null}
            </AsyncState>
          )}
          {isEmpty && (
            <AsyncState isLoading={false} error={null} isEmpty emptyTitle={EMPTY[scope].title} emptyMessage={EMPTY[scope].message}>
              {null}
            </AsyncState>
          )}
        </View>
      }
      ListFooterComponent={
        reports.hasNextPage || reports.isFetchingNextPage ? (
          <View style={styles.footer}>
            {reports.isFetchingNextPage ? (
              <ActivityIndicator color={theme.textSecondary} accessibilityLabel="Loading more reports" />
            ) : (
              <Button label="Load more" variant="secondary" onPress={() => reports.fetchNextPage()} />
            )}
          </View>
        ) : undefined
      }
      onEndReached={() => {
        if (reports.hasNextPage && !reports.isFetchingNextPage) reports.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={reports.isRefetching && !reports.isFetchingNextPage}
          onRefresh={() => {
            reports.refetch();
          }}
          tintColor={theme.textSecondary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  // Cells stretch to the full width; each child is capped and centred.
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
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
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
