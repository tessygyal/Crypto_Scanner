import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form/form-message';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

/**
 * "Delete" button with an in-app confirmation step. Used instead of a native
 * alert so it behaves the same on Android, iOS and web.
 */
export function ConfirmDelete({
  buttonLabel,
  question,
  explanation,
  onConfirm,
  isPending,
  error,
}: {
  buttonLabel: string;
  question: string;
  explanation: string;
  onConfirm: () => void;
  isPending: boolean;
  error: Error | null;
}) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return <Button label={buttonLabel} variant="secondary" onPress={() => setConfirming(true)} fullWidth />;
  }

  return (
    <View style={[styles.box, { borderColor: theme.danger, backgroundColor: theme.surface }]} accessibilityRole="alert">
      <ThemedText variant="bodyBold">{question}</ThemedText>
      <ThemedText variant="small" color="textSecondary">
        {explanation}
      </ThemedText>
      {error && <FormMessage tone="error" message={error.message} />}
      <View style={styles.buttons}>
        <Button label="Delete" variant="danger" onPress={onConfirm} loading={isPending} />
        <Button label="Cancel" variant="secondary" onPress={() => setConfirming(false)} disabled={isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
