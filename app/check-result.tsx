import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { RiskSummary } from '@/components/risk/risk-summary';
import { SignalList } from '@/components/risk/signal-list';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useSaveCheck } from '@/hooks/use-save-check';
import { useTheme } from '@/hooks/use-theme';
import { spacing } from '@/theme';
import { analyzeScheme, cleanSchemeAnswers } from '@/utils/risk/scheme-scorecard';
import { LEVEL_COPY } from '@/utils/risk/scoring';
import type { RiskResult } from '@/utils/risk/types';
import { analyzeUrl } from '@/utils/risk/url-analysis';

type Params = { type?: string; input?: string; answers?: string };

/** Work out the result from the route params. All analysis runs on the phone. */
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

  if ('error' in outcome) {
    return (
      <Screen hasHeader>
        <FormMessage tone="error" message={outcome.error} />
        <Button label="Back to Check" onPress={() => router.back()} />
      </Screen>
    );
  }

  const { result } = outcome;
  const indicators = result.signals.filter((s) => s.weight > 0);

  return (
    <Screen hasHeader>
      <View style={styles.input}>
        <ThemedText variant="small" color="textSecondary">
          {result.type === 'url' ? 'Link checked' : 'Offer checked'}
        </ThemedText>
        <ThemedText variant="bodyBold" selectable>
          {result.input}
        </ThemedText>
      </View>

      <RiskSummary level={result.level} score={result.score} />

      {result.signals.length > 0 && (
        <View style={styles.section}>
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

      <View style={styles.section}>
        <ThemedText variant="heading">What to do</ThemedText>
        {LEVEL_COPY[result.level].advice.map((tip) => (
          <View key={tip} style={styles.tip}>
            <ThemedText>•</ThemedText>
            <ThemedText style={styles.tipText}>{tip}</ThemedText>
          </View>
        ))}
      </View>

      <SaveStatus result={result} />

      <Button label="Check something else" variant="secondary" onPress={() => router.back()} fullWidth />

      <Disclaimer />
    </Screen>
  );
}

/** Saves the result to history once, and shows saving / saved / error-with-retry. */
function SaveStatus({ result }: { result: RiskResult }) {
  const theme = useTheme();
  const save = useSaveCheck();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    save.mutate(result);
  }, [save, result]);

  if (save.isPending) {
    return (
      <View style={styles.saveRow} accessibilityLiveRegion="polite">
        <ActivityIndicator color={theme.textSecondary} />
        <ThemedText variant="small" color="textSecondary">
          Saving to your history…
        </ThemedText>
      </View>
    );
  }
  if (save.isError) {
    return (
      <View style={styles.section}>
        <FormMessage tone="error" title="Not saved to history" message={save.error.message} />
        <Button label="Try saving again" variant="secondary" onPress={() => save.mutate(result)} />
      </View>
    );
  }
  if (save.isSuccess) {
    return (
      <View style={styles.saveRow} accessibilityLiveRegion="polite">
        <Ionicons name="checkmark-circle-outline" size={18} color={theme.textSecondary} />
        <ThemedText variant="small" color="textSecondary">
          Saved to your history
        </ThemedText>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  input: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  tip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipText: {
    flex: 1,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
