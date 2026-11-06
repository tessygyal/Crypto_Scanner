import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ConfigNotice } from '@/components/config-notice';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { ResendConfirmation } from '@/components/form/resend-confirmation';
import { TextField } from '@/components/form/text-field';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useSignIn } from '@/hooks/use-auth-actions';
import { FriendlyAuthError } from '@/utils/auth-errors';
import { loginSchema, type LoginForm } from '@/utils/auth-validation';

export default function LoginScreen() {
  const signIn = useSignIn();
  const { control, handleSubmit, setFocus } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // On success the session changes and protected routes move to the tabs.
  const onSubmit = handleSubmit((values) => signIn.mutate(values));

  return (
    <Screen>
      <View className="gap-sm mt-lg">
        <ThemedText variant="title">Scam Detector PNG</ThemedText>
        <ThemedText color="textSecondary">Sign in to check links and report scam schemes.</ThemedText>
      </View>

      <ConfigNotice />

      <View className="gap-md">
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
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => onSubmit()}
        />

        {signIn.error && <FormMessage tone="error" message={signIn.error.message} />}
        {signIn.error instanceof FriendlyAuthError && signIn.error.code === 'email_not_confirmed' && signIn.variables && (
          <ResendConfirmation email={signIn.variables.email} />
        )}

        <Button label="Sign in" onPress={onSubmit} loading={signIn.isPending} fullWidth />

        <Link href="/forgot-password" className="self-center py-sm">
          <ThemedText variant="smallBold" color="primary">
            Forgot your password?
          </ThemedText>
        </Link>
      </View>

      <View className="flex-row justify-center items-center gap-sm">
        <ThemedText color="textSecondary">New here?</ThemedText>
        <Link href="/register">
          <ThemedText variant="bodyBold" color="primary">
            Create an account
          </ThemedText>
        </Link>
      </View>

      <Disclaimer />
    </Screen>
  );
}
