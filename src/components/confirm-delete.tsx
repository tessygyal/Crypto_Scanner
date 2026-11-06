import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form/form-message';
import { ThemedText } from '@/components/themed-text';

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
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return <Button label={buttonLabel} variant="secondary" onPress={() => setConfirming(true)} fullWidth />;
  }

  return (
    <View className="gap-sm rounded-md border border-danger bg-surface p-md" accessibilityRole="alert">
      <ThemedText variant="bodyBold">{question}</ThemedText>
      <ThemedText variant="small" color="textSecondary">
        {explanation}
      </ThemedText>
      {error && <FormMessage tone="error" message={error.message} />}
      <View className="flex-row gap-sm">
        <Button label="Delete" variant="danger" onPress={onConfirm} loading={isPending} />
        <Button label="Cancel" variant="secondary" onPress={() => setConfirming(false)} disabled={isPending} />
      </View>
    </View>
  );
}
