import { StyleSheet, View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useSupabaseHealth } from '@/hooks/use-supabase-health';
import { riskColors, spacing } from '@/theme';
import { appEnv } from '@/utils/env';

/**
 * M0 home: shows whether the project is set up correctly.
 * Replaced by the auth flow and tabs in M1.
 */
export default function SetupStatusScreen() {
  const health = useSupabaseHealth();

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText variant="title">Scam Detector PNG</ThemedText>
        <ThemedText color="textSecondary">
          Check links, tokens and offers for scam risk indicators before you send money or crypto.
        </ThemedText>
      </View>

      <Disclaimer />

      <View style={styles.section}>
        <ThemedText variant="heading">Setup status</ThemedText>
        <AsyncState
          isLoading={health.isLoading}
          error={health.error}
          isEmpty={!health.isConfigured}
          loadingMessage="Connecting to Supabase…"
          emptyTitle="Supabase is not configured yet"
          emptyMessage={notConfiguredMessage()}
          onRetry={() => health.refetch()}
          isRetrying={health.isFetching}>
          {health.data && (
            <View style={styles.row} accessibilityLabel="Connected to Supabase">
              <View style={[styles.dot, { backgroundColor: riskColors.none }]} />
              <ThemedText>
                Connected to Supabase ({health.data.service} {health.data.version})
              </ThemedText>
            </View>
          )}
        </AsyncState>
      </View>
    </Screen>
  );
}

function notConfiguredMessage() {
  if (appEnv.ok) return undefined;
  const problems = [
    ...appEnv.missing.map((k) => `${k} is missing`),
    ...appEnv.invalid.map((k) => `${k} is not valid`),
  ];
  return (
    `${problems.map((p) => `• ${p}`).join('\n')}\n\n` +
    'Copy .env.example to .env, fill in your Supabase project URL and publishable key, ' +
    'then restart the dev server with `npx expo start --clear`.'
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
