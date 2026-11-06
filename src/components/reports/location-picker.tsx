import { useMutation } from '@tanstack/react-query';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form/form-message';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { getApproximateLocation, LocationError, type Coordinates } from '@/services/location';
import { radius, spacing } from '@/theme';

/**
 * Optional, approximate location for a report. Handles every permission
 * outcome: granted, refused, blocked (points to Settings) and location off.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: Coordinates | null;
  onChange: (value: Coordinates | null) => void;
}) {
  const theme = useTheme();
  const locate = useMutation({ mutationFn: getApproximateLocation, onSuccess: onChange });
  const error = locate.error;
  const needsSettings = error instanceof LocationError && error.needsSettings;

  return (
    <View style={styles.field}>
      <ThemedText variant="smallBold">Location (optional)</ThemedText>
      <ThemedText variant="small" color="textSecondary">
        Shows roughly where the scam is happening on the community map. It is rounded to about 1 km — never your
        exact position.
      </ThemedText>

      {value ? (
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText variant="bodyBold">Approximate location added</ThemedText>
          <ThemedText variant="small" color="textSecondary">
            {value.latitude.toFixed(2)}, {value.longitude.toFixed(2)} (to about 1 km)
          </ThemedText>
          <Button
            label="Remove location"
            variant="secondary"
            onPress={() => {
              locate.reset();
              onChange(null);
            }}
          />
        </View>
      ) : (
        <Button
          label="Use my approximate location"
          variant="secondary"
          onPress={() => locate.mutate()}
          loading={locate.isPending}
          fullWidth
        />
      )}

      {error && !value && (
        <FormMessage tone="error" message={error instanceof LocationError ? error.message : "Couldn't get your location."} />
      )}
      {needsSettings && Platform.OS !== 'web' && (
        <Button label="Open Settings" variant="secondary" onPress={() => Linking.openSettings()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
