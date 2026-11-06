import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form/form-message';
import { useResendConfirmation } from '@/hooks/use-auth-actions';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import { spacing } from '@/theme';

/**
 * "Resend confirmation email" with a countdown, so people don't hit Supabase's
 * per-user email limit. Set `sentJustNow` when an email was sent a moment ago
 * (straight after registering) so the countdown starts running.
 */
export function ResendConfirmation({ email, sentJustNow = false }: { email: string; sentJustNow?: boolean }) {
  const resend = useResendConfirmation();
  const { secondsLeft, start } = useResendCooldown();

  const startedOnMount = useRef(false);
  useEffect(() => {
    if (startedOnMount.current || !sentJustNow) return;
    startedOnMount.current = true;
    start();
  }, [sentJustNow, start]);

  const waiting = secondsLeft > 0;
  return (
    <View style={styles.box}>
      {resend.isSuccess && (
        <FormMessage
          tone="success"
          message={`Sent again to ${email}. It can take a minute to arrive, so check your spam folder too.`}
        />
      )}
      {resend.error && <FormMessage tone="error" message={resend.error.message} />}
      <Button
        label={waiting ? `Resend email in ${secondsLeft}s` : 'Resend confirmation email'}
        variant="secondary"
        onPress={() => resend.mutate(email, { onSuccess: start })}
        disabled={waiting || !email}
        loading={resend.isPending}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
  },
});
