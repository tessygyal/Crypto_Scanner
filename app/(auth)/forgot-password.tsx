import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ConfigNotice } from '@/components/config-notice';
import { FormMessage } from '@/components/form/form-message';
import { TextField } from '@/components/form/text-field';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useRequestPasswordReset, useResetPassword } from '@/hooks/use-auth-actions';
import {
  requestResetSchema,
  resetPasswordSchema,
  type RequestResetForm,
  type ResetPasswordForm,
} from '@/utils/auth-validation';

/**
 * Two steps, no deep links needed:
 *  1. Enter email → Supabase emails a one-time code.
 *  2. Enter the code and a new password → signed in with the new password.
 */
export default function ForgotPasswordScreen() {
  const request = useRequestPasswordReset();
  const emailForm = useForm<RequestResetForm>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: '' },
  });

  const sentTo = request.isSuccess ? request.variables : null;

  return (
    <Screen hasHeader>
      <ConfigNotice />

      {!sentTo ? (
        <View className="gap-md">
          <ThemedText color="textSecondary">
            Enter the email you signed up with. We&apos;ll email you a code to set a new password.
          </ThemedText>
          <TextField
            control={emailForm.control}
            name="email"
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => emailForm.handleSubmit(({ email }) => request.mutate(email))()}
          />
          {request.error && <FormMessage tone="error" message={request.error.message} />}
          <Button
            label="Send code"
            onPress={emailForm.handleSubmit(({ email }) => request.mutate(email))}
            loading={request.isPending}
            fullWidth
          />
        </View>
      ) : (
        <ResetStep email={sentTo} onUseDifferentEmail={() => request.reset()} />
      )}
    </Screen>
  );
}

function ResetStep({ email, onUseDifferentEmail }: { email: string; onUseDifferentEmail: () => void }) {
  const reset = useResetPassword();
  const { control, handleSubmit, setFocus } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  // On success the user is signed in, and protected routes move to the tabs.
  const onSubmit = handleSubmit(({ code, password }) => reset.mutate({ email, code, password }));

  return (
    <View className="gap-md">
      <FormMessage
        tone="success"
        title="Check your email"
        message={`If ${email} has an account, we've sent it a code. It may take a minute, so check your spam folder too.`}
      />
      <TextField
        control={control}
        name="code"
        label="Code from the email"
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={10}
        returnKeyType="next"
        onSubmitEditing={() => setFocus('password')}
      />
      <TextField
        control={control}
        name="password"
        label="New password"
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
        label="Confirm new password"
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => onSubmit()}
      />
      {reset.error && <FormMessage tone="error" message={reset.error.message} />}
      <Button label="Set new password" onPress={onSubmit} loading={reset.isPending} fullWidth />
      <Button label="Use a different email" variant="secondary" onPress={onUseDifferentEmail} fullWidth />
    </View>
  );
}
