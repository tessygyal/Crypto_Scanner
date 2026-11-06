import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { ConfirmDelete } from '@/components/confirm-delete';
import { RiskSummary } from '@/components/risk/risk-summary';
import { SignalList } from '@/components/risk/signal-list';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useCheck, useDeleteCheck } from '@/hooks/use-history';
import type { CheckRow } from '@/types/database';
import { CHECK_TYPE_LABEL, formatDateTime, parseStoredSignals, rerunParams } from '@/utils/history';
import { isOfflineWithoutData } from '@/utils/offline';

/** A saved check exactly as it was recorded. Viewing does not create a new check. */
export default function SavedCheckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const check = useCheck(id);

  return (
    <Screen hasHeader>
      <AsyncState
        isLoading={check.isLoading}
        error={check.error}
        isOffline={isOfflineWithoutData(check)}
        isEmpty={check.isSuccess && !check.data}
        loadingMessage="Loading check…"
        emptyTitle="Check not found"
        emptyMessage="It may have been deleted."
        onRetry={() => check.refetch()}
        isRetrying={check.isFetching}>
        {check.data && <SavedCheck check={check.data} />}
      </AsyncState>
      {check.isSuccess && !check.data && <Button label="Back to history" onPress={() => router.back()} />}
    </Screen>
  );
}

function SavedCheck({ check }: { check: CheckRow }) {
  const signals = parseStoredSignals(check.signals);
  const indicators = signals.filter((s) => s.weight > 0);
  const rerun = rerunParams(check);

  return (
    <View className="gap-lg">
      <View className="gap-xs">
        <ThemedText variant="small" color="textSecondary">
          {CHECK_TYPE_LABEL[check.type]} checked {formatDateTime(check.created_at)}
        </ThemedText>
        <ThemedText variant="bodyBold" selectable>
          {check.input}
        </ThemedText>
      </View>

      <RiskSummary level={check.risk_level} score={check.score} />

      {signals.length > 0 && (
        <View className="gap-md">
          <ThemedText variant="heading">
            {indicators.length === 1 ? '1 risk indicator' : indicators.length ? `${indicators.length} risk indicators` : 'Notes'}
          </ThemedText>
          <SignalList signals={signals} />
        </View>
      )}

      <ThemedText variant="small" color="textSecondary">
        This is the result saved at the time. Re-run the check to see full explanations using the latest rules.
      </ThemedText>

      {rerun && (
        <Button
          label="Re-run check"
          onPress={() => router.push({ pathname: '/check-result', params: rerun })}
          fullWidth
        />
      )}

      <DeleteCheck id={check.id} />
    </View>
  );
}

function DeleteCheck({ id }: { id: string }) {
  const remove = useDeleteCheck();
  return (
    <ConfirmDelete
      buttonLabel="Delete from history"
      question="Delete this check?"
      explanation="It will be removed from your history. This can't be undone."
      onConfirm={() => remove.mutate(id, { onSuccess: () => router.back() })}
      isPending={remove.isPending}
      error={remove.error}
    />
  );
}
