import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { RiskSummary } from '@/components/risk/risk-summary';
import { SignalList } from '@/components/risk/signal-list';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useSafeBrowsing } from '@/hooks/use-safe-browsing';
import { useSaveCheck } from '@/hooks/use-save-check';
import { useTheme } from '@/hooks/use-theme';
import { SAVE_QUEUED_MESSAGE } from '@/utils/offline';
import { analyzeScheme, cleanSchemeAnswers } from '@/utils/risk/scheme-scorecard';
import { LEVEL_COPY } from '@/utils/risk/scoring';
import type { RiskResult } from '@/utils/risk/types';
import { analyzeUrl } from '@/utils/risk/url-analysis';
import { safeBrowsingTarget, withSafeBrowsing } from '@/utils/safe-browsing';

type Params = { type?: string; input?: string; answers?: string; source?: string };

/** Work out the offline result from the route params. This part runs on the phone. */
function resultFromParams(params: Params): { result: RiskResult } | { error: string } {
  if (params.type === 'url') {
    const analysis = analyzeUrl(params.input ?? '');
    return analysis.ok ? { result: analysis.result } : { error: analysis.error };
  }
  if (params.type === 'scheme') {
    const yes = cleanSchemeAnswers((params.answers ?? '').split(','));
    return { result: analyzeScheme(yes) };
  }
  return { error: 'Nothing to check. Go back and enter a link or answer the questions.' };
}

export default function CheckResultScreen() {
  const params = useLocalSearchParams<Params>();
  const outcome = useMemo(() => resultFromParams(params), [params]);

  // Links are also looked up in Google Safe Browsing (via our Edge Function).
  const target = 'result' in outcome ? safeBrowsingTarget(outcome.result) : null;
  const google = useSafeBrowsing(target);

  const result = useMemo(() => {
    if (!('result' in outcome)) return null;
    if (target === null) return outcome.result;
    if (google.isSuccess) return withSafeBrowsing(outcome.result, google.data);
    if (google.isError) return withSafeBrowsing(outcome.result, { status: 'unavailable' });
    return outcome.result;
  }, [outcome, target, google.isSuccess, google.isError, google.data]);

  if ('error' in outcome || !result) {
    return (
      <Screen hasHeader>
        <FormMessage tone="error" message={'error' in outcome ? outcome.error : 'Nothing to check.'} />
        <Button label="Back to Check" onPress={() => router.back()} />
      </Screen>
    );
  }

  // Wait for Google before showing the level, so it doesn't change while being read.
  const settled = target === null || google.isSuccess || google.isError;
  const indicators = result.signals.filter((s) => s.weight > 0);

  return (
    <Screen hasHeader>
      <View className="gap-xs">
        <ThemedText variant="small" color="textSecondary">
          {result.type === 'url' ? (params.source === 'qr' ? 'Link from a QR code' : 'Link checked') : 'Offer checked'}
        </ThemedText>
        <ThemedText variant="bodyBold" selectable>
          {result.input}
        </ThemedText>
      </View>

      {target !== null && (
        <AsyncState
          isLoading={google.isPending}
          error={google.error}
          loadingMessage="Checking with Google Safe Browsing…"
          onRetry={() => google.refetch()}
          isRetrying={google.isFetching}>
          <ThemedText variant="small" color="textSecondary">
            Checked on your phone and with Google Safe Browsing.
          </ThemedText>
        </AsyncState>
      )}
      {google.isError && (
        <ThemedText variant="small" color="textSecondary">
          The result below uses only the checks on your phone.
        </ThemedText>
      )}

      {settled && (
        <>
          <RiskSummary level={result.level} score={result.score} />

          {result.signals.length > 0 && (
            <View className="gap-md">
              <ThemedText variant="heading">
                {indicators.length === 0
                  ? 'Notes'
                  : indicators.length === 1
                    ? '1 risk indicator'
                    : `${indicators.length} risk indicators`}
              </ThemedText>
              <SignalList signals={result.signals} />
            </View>
          )}

          <View className="gap-md">
            <ThemedText variant="heading">What to do</ThemedText>
            {LEVEL_COPY[result.level].advice.map((tip) => (
              <View key={tip} className="flex-row gap-sm">
                <ThemedText>•</ThemedText>
                <ThemedText className="flex-1">{tip}</ThemedText>
              </View>
            ))}
          </View>

          <SaveStatus result={result} />
        </>
      )}

      <Button label="Check something else" variant="secondary" onPress={() => router.back()} fullWidth />

      <Disclaimer />
    </Screen>
  );
}

/**
 * Saves the result to history once, and shows saving / saved / error-with-retry.
 * Mounted only after Google Safe Browsing has answered (or failed), so the saved
 * result includes it.
 */
function SaveStatus({ result }: { result: RiskResult }) {
  const theme = useTheme();
  const save = useSaveCheck();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    save.mutate(result);
  }, [save, result]);

  if (save.isPaused) {
    return (
      <View className="flex-row items-center gap-sm" accessibilityLiveRegion="polite">
        <Ionicons name="cloud-offline-outline" size={18} color={theme.textSecondary} />
        <ThemedText variant="small" color="textSecondary" className="flex-1">
          {SAVE_QUEUED_MESSAGE}
        </ThemedText>
      </View>
    );
  }
  if (save.isPending) {
    return (
      <View className="flex-row items-center gap-sm" accessibilityLiveRegion="polite">
        <ActivityIndicator color={theme.textSecondary} />
        <ThemedText variant="small" color="textSecondary">
          Saving to your history…
        </ThemedText>
      </View>
    );
  }
  if (save.isError) {
    return (
      <View className="gap-md">
        <FormMessage tone="error" title="Not saved to history" message={save.error.message} />
        <Button label="Try saving again" variant="secondary" onPress={() => save.mutate(result)} />
      </View>
    );
  }
  if (save.isSuccess) {
    return (
      <View className="flex-row items-center gap-sm" accessibilityLiveRegion="polite">
        <Ionicons name="checkmark-circle-outline" size={18} color={theme.textSecondary} />
        <ThemedText variant="small" color="textSecondary">
          Saved to your history
        </ThemedText>
      </View>
    );
  }
  return null;
}
