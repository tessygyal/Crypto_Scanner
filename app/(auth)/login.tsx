import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ConfigNotice } from '@/components/config-notice';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { TextField } from '@/components/form/text-field';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useSignIn } from '@/hooks/use-auth-actions';
import { spacing } from '@/theme';
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
      <View style={styles.header}>
        <ThemedText variant="title">Scam Detector PNG</ThemedText>
        <ThemedText color="textSecondary">Sign in to check links and report scam schemes.</ThemedText>
      </View>

      <ConfigNotice />

      <View style={styles.form}>
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

        <Button label="Sign in" onPress={onSubmit} loading={signIn.isPending} fullWidth />

        <Link href="/forgot-password" style={styles.link}>
          <ThemedText variant="smallBold" color="primary">
            Forgot your password?
          </ThemedText>
        </Link>
      </View>

      <View style={styles.footer}>
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

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
