import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { TextField } from '@/components/form/text-field';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-provider';
import { useSignOut } from '@/hooks/use-auth-actions';
import { useMyProfile, useUpdateDisplayName } from '@/hooks/use-profile';
import { useSupabaseHealth } from '@/hooks/use-supabase-health';
import { useTheme } from '@/hooks/use-theme';
import { radius, riskColors, spacing } from '@/theme';
import type { Profile } from '@/types/database';
import { editProfileSchema, type EditProfileForm } from '@/utils/auth-validation';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const profile = useMyProfile();
  const signOut = useSignOut();
  const health = useSupabaseHealth();

  return (
    <Screen>
      <ThemedText variant="title">Profile</ThemedText>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <AsyncState
          isLoading={profile.isLoading}
          error={profile.error}
          isEmpty={profile.isSuccess && !profile.data}
          loadingMessage="Loading your profile…"
          emptyTitle="Profile not found"
          emptyMessage="Your profile hasn't been created yet. Try signing out and in again."
          onRetry={() => profile.refetch()}
          isRetrying={profile.isFetching}>
          {profile.data && <DisplayName profile={profile.data} />}
        </AsyncState>
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

/** Display name with an inline edit form. */
function DisplayName({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateDisplayName();
  const { control, handleSubmit, reset } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { displayName: profile.display_name },
  });

  const save = handleSubmit(({ displayName }) =>
    update.mutate(displayName, { onSuccess: () => setEditing(false) })
  );

  if (!editing) {
    return (
      <View style={styles.rowWithAction}>
        <Row label="Display name" value={profile.display_name} />
        <Button
          label="Edit"
          variant="secondary"
          onPress={() => {
            reset({ displayName: profile.display_name });
            update.reset();
            setEditing(true);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.editForm}>
      <TextField
        control={control}
        name="displayName"
        label="Display name"
        hint="Shown on reports you submit. You don't need to use your real name."
        autoCapitalize="words"
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={() => save()}
      />
      {update.error && <FormMessage tone="error" message={update.error.message} />}
      <View style={styles.buttons}>
        <Button label="Save" onPress={save} loading={update.isPending} />
        <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} disabled={update.isPending} />
      </View>
    </View>
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
    flexShrink: 1,
  },
  rowWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  editForm: {
    gap: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
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
