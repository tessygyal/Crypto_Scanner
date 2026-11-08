import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncState } from '@/components/async-state';
import { HeroHeader } from '@/components/hero-header';
import { Button } from '@/components/button';
import { ChoiceChip } from '@/components/choice-chip';
import { OfflineBanner } from '@/components/offline-banner';
import { ReportRow } from '@/components/reports/report-row';
import { ThemedText } from '@/components/themed-text';
import { useIsModerator } from '@/hooks/use-moderation';
import { useReports } from '@/hooks/use-reports';
import { useTheme } from '@/hooks/use-theme';
import type { ReportScope } from '@/services/reports';
import { spacing } from '@/theme';
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
  review: {
    title: 'Nothing to review',
    message: 'There are no pending reports from other people right now.',
  },
};

export default function ReportsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isModerator = useIsModerator().data === true;
  const [chosenScope, setScope] = useState<ReportScope>('community');
  // If moderator access is removed, fall back to the community list.
  const scope = chosenScope === 'review' && !isModerator ? 'community' : chosenScope;
  const reports = useReports(scope);
  const items = reports.data?.pages.flatMap((p) => p.reports) ?? [];
  const isEmpty = reports.isSuccess && items.length === 0;

  return (
    <View className="flex-1 bg-background">
      <HeroHeader icon="megaphone" title="Community reports" subtitle="Scam schemes reported by people in PNG. Reports describe schemes and platforms, never named people." />
      <FlatList
        className="flex-1"
      contentContainerClassName="px-lg"
      // Safe-area insets are only known at runtime, so they stay as a style.
      contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      data={reports.isSuccess ? items : []}
      keyExtractor={(r) => r.id}
      renderItem={({ item }) => (
        <View className="w-full max-w-content self-center mb-sm">
          <ReportRow
            report={item}
            showStatus={scope === 'mine'}
            onPress={() => router.push({ pathname: '/report/[id]', params: { id: item.id } })}
          />
        </View>
      )}
      ListHeaderComponent={
        <View className="w-full max-w-content self-center gap-md mb-md">
          <Button label="Report a scam scheme" onPress={() => router.push('/report/new')} fullWidth />

          <View className="flex-row gap-sm" accessibilityRole="radiogroup" accessibilityLabel="Which reports to show">
            <ChoiceChip label="Community" selected={scope === 'community'} onPress={() => setScope('community')} />
            <ChoiceChip label="My reports" selected={scope === 'mine'} onPress={() => setScope('mine')} />
            {isModerator && (
              <ChoiceChip label="To review" selected={scope === 'review'} onPress={() => setScope('review')} />
            )}
          </View>
          {scope === 'review' && (
            <ThemedText variant="small" color="textSecondary">
              Pending reports from other people, oldest first. Open one to approve or reject it.
            </ThemedText>
          )}

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
          <View className="py-md items-center">
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
    </View>
  );
}
