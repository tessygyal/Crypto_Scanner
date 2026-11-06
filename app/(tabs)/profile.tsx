import { StyleSheet, View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-provider';
import { useSignOut } from '@/hooks/use-auth-actions';
import { useSupabaseHealth } from '@/hooks/use-supabase-health';
import { useTheme } from '@/hooks/use-theme';
import { radius, riskColors, spacing } from '@/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const signOut = useSignOut();
  const health = useSupabaseHealth();

  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? 'Not set';

  return (
    <Screen>
      <ThemedText variant="title">Profile</ThemedText>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Row label="Display name" value={displayName} />
        <Row label="Email" value={user?.email ?? '—'} />
      </View>

      {signOut.error && <FormMessage tone="error" message={signOut.error.message} />}
      {/* After sign-out, protected routes move to the login screen. */}
      <Button label="Sign out" variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending} />

      <View style={styles.section}>
        <ThemedText variant="heading">App status</ThemedText>
        <AsyncState
          isLoading={health.isLoading}
          error={health.error}
          isEmpty={!health.isConfigured}
          loadingMessage="Checking connection…"
          emptyTitle="Supabase is not configured"
          onRetry={() => health.refetch()}
          isRetrying={health.isFetching}>
          {health.data && (
            <View style={styles.statusRow} accessibilityLabel="Connected to Supabase">
              <View style={[styles.dot, { backgroundColor: riskColors.none }]} />
              <ThemedText>Connected to Supabase</ThemedText>
            </View>
          )}
        </AsyncState>
      </View>

      <Disclaimer />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText variant="small" color="textSecondary">
        {label}
      </ThemedText>
      <ThemedText variant="bodyBold" selectable>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  statusRow: {
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
