import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ConfigNotice } from '@/components/config-notice';
import { FormMessage } from '@/components/form/form-message';
import { TextField } from '@/components/form/text-field';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useSignUp } from '@/hooks/use-auth-actions';
import { spacing } from '@/theme';
import { registerSchema, type RegisterForm } from '@/utils/auth-validation';

export default function RegisterScreen() {
  const signUp = useSignUp();
  const { control, handleSubmit, setFocus, getValues } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(({ displayName, email, password }) =>
    signUp.mutate({ displayName, email, password })
  );

  // If Supabase signs the user in straight away, protected routes move to the tabs.
  // Otherwise they must confirm their email first.
  if (signUp.data?.needsEmailConfirmation) {
    return (
      <Screen hasHeader>
        <FormMessage
          tone="success"
          title="Check your email"
          message={`We sent a confirmation link to ${getValues('email')}. Open it on this phone, then come back and sign in.`}
        />
        <Link href="/login" replace>
          <ThemedText variant="bodyBold" color="primary">
            Back to sign in
          </ThemedText>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen hasHeader>
      <ThemedText color="textSecondary">
        Your account lets you save checks and report scam schemes to the community map.
      </ThemedText>

      <ConfigNotice />

      <View style={styles.form}>
        <TextField
          control={control}
          name="displayName"
          label="Display name"
          placeholder="e.g. Kila"
          hint="Shown on reports you submit. You don't need to use your real name."
          autoCapitalize="words"
          autoComplete="nickname"
          returnKeyType="next"
          onSubmitEditing={() => setFocus('email')}
          maxLength={40}
        />
        <TextField
          control={control}
          name="email"
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => setFocus('password')}
        />
        <TextField
          control={control}
          name="password"
          label="Password"
          secure
          hint="At least 8 characters, with a letter and a number."
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => setFocus('confirmPassword')}
        />
        <TextField
          control={control}
          name="confirmPassword"
          label="Confirm password"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => onSubmit()}
        />

        {signUp.error && <FormMessage tone="error" message={signUp.error.message} />}

        <Button label="Create account" onPress={onSubmit} loading={signUp.isPending} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
});
