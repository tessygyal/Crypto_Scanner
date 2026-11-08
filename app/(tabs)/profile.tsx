import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { TextField } from '@/components/form/text-field';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-provider';
import { useSignOut } from '@/hooks/use-auth-actions';
import { useIsModerator } from '@/hooks/use-moderation';
import { useMyProfile, useUpdateDisplayName } from '@/hooks/use-profile';
import { useSupabaseHealth } from '@/hooks/use-supabase-health';
import type { Profile } from '@/types/database';
import { editProfileSchema, type EditProfileForm } from '@/utils/auth-validation';
import { isOfflineWithoutData } from '@/utils/offline';
import { Card } from '@/components/card';

export default function ProfileScreen() {
  const { user } = useAuth();
  const profile = useMyProfile();
  const signOut = useSignOut();
  const health = useSupabaseHealth();
  const isModerator = useIsModerator().data === true;

  return (
    <Screen hero={{ icon: 'person-circle', title: 'Profile', subtitle: 'Your account and app status.' }}>

      <Card className="gap-md">
        <AsyncState
          isLoading={profile.isLoading}
          error={profile.error}
          isOffline={isOfflineWithoutData(profile)}
          isEmpty={profile.isSuccess && !profile.data}
          loadingMessage="Loading your profile…"
          emptyTitle="Profile not found"
          emptyMessage="Your profile hasn't been created yet. Try signing out and in again."
          onRetry={() => profile.refetch()}
          isRetrying={profile.isFetching}>
          {profile.data && <DisplayName profile={profile.data} />}
        </AsyncState>
        <Row label="Email" value={user?.email ?? '—'} />
        {isModerator && (
          <Row label="Role" value="Moderator: review pending reports under Reports → To review" />
        )}
      </Card>

      {signOut.error && <FormMessage tone="error" message={signOut.error.message} />}
      {/* After sign-out, protected routes move to the login screen. */}
      <Button label="Sign out" variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending} />

      <View className="gap-md">
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
            <View className="flex-row items-center gap-sm" accessibilityLabel="Connected to Supabase">
              <View className="h-3 w-3 rounded-pill bg-risk-none" />
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
      <View className="flex-row items-center justify-between gap-md">
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
    <View className="gap-md">
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
      <View className="flex-row gap-sm">
        <Button label="Save" onPress={save} loading={update.isPending} />
        <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} disabled={update.isPending} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-xs shrink">
      <ThemedText variant="small" color="textSecondary">
        {label}
      </ThemedText>
      <ThemedText variant="bodyBold" selectable>
        {value}
      </ThemedText>
    </View>
  );
}
