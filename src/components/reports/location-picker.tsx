import { useMutation } from '@tanstack/react-query';
import { Linking, Platform, View } from 'react-native';

import { Button } from '@/components/button';
import { FormMessage } from '@/components/form/form-message';
import { ThemedText } from '@/components/themed-text';
import { getApproximateLocation, LocationError, type Coordinates } from '@/services/location';

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
  const locate = useMutation({ mutationFn: getApproximateLocation, onSuccess: onChange });
  const error = locate.error;
  const needsSettings = error instanceof LocationError && error.needsSettings;

  return (
    <View className="gap-sm">
      <ThemedText variant="smallBold">Location (optional)</ThemedText>
      <ThemedText variant="small" color="textSecondary">
        Shows roughly where the scam is happening on the community map. It is rounded to about 1 km — never your
        exact position.
      </ThemedText>

      {value ? (
        <View className="gap-sm rounded-md border border-border bg-surface p-md">
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
        <FormMessage
          tone="error"
          message={`${error instanceof LocationError ? error.message : "Couldn't get your location."} You can still report without a location.`}
        />
      )}
      {needsSettings && Platform.OS !== 'web' && (
        <Button label="Open Settings" variant="secondary" onPress={() => Linking.openSettings()} />
      )}
    </View>
  );
}
