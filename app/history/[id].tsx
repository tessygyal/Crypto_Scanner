import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { FormMessage } from '@/components/form/form-message';
import { RiskSummary } from '@/components/risk/risk-summary';
import { SignalList } from '@/components/risk/signal-list';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useCheck, useDeleteCheck } from '@/hooks/use-history';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import type { CheckRow } from '@/types/database';
import { CHECK_TYPE_LABEL, formatDateTime, parseStoredSignals, rerunParams } from '@/utils/history';

/** A saved check exactly as it was recorded. Viewing does not create a new check. */
export default function SavedCheckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const check = useCheck(id);

  return (
    <Screen hasHeader>
      <AsyncState
        isLoading={check.isLoading}
        error={check.error}
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
    <View style={styles.page}>
      <View style={styles.meta}>
        <ThemedText variant="small" color="textSecondary">
          {CHECK_TYPE_LABEL[check.type]} checked {formatDateTime(check.created_at)}
        </ThemedText>
        <ThemedText variant="bodyBold" selectable>
          {check.input}
        </ThemedText>
      </View>

      <RiskSummary level={check.risk_level} score={check.score} />

      {signals.length > 0 && (
        <View style={styles.section}>
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

/** Delete with an in-app confirmation step (works the same on phones and web). */
function DeleteCheck({ id }: { id: string }) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteCheck();

  if (!confirming) {
    return <Button label="Delete from history" variant="secondary" onPress={() => setConfirming(true)} fullWidth />;
  }

  return (
    <View style={[styles.confirm, { borderColor: theme.danger, backgroundColor: theme.surface }]} accessibilityRole="alert">
      <ThemedText variant="bodyBold">Delete this check?</ThemedText>
      <ThemedText variant="small" color="textSecondary">
        It will be removed from your history. This can&apos;t be undone.
      </ThemedText>
      {remove.error && <FormMessage tone="error" message={remove.error.message} />}
      <View style={styles.confirmButtons}>
        <Button
          label="Delete"
          variant="danger"
          onPress={() => remove.mutate(id, { onSuccess: () => router.back() })}
          loading={remove.isPending}
        />
        <Button label="Cancel" variant="secondary" onPress={() => setConfirming(false)} disabled={remove.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
  meta: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  confirm: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
