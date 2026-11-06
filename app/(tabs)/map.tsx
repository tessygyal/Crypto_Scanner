import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AsyncState } from '@/components/async-state';
import { Button } from '@/components/button';
import { FormMessage } from '@/components/form/form-message';
import { ReportMap, type MapFocus } from '@/components/map/report-map';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMapReports } from '@/hooks/use-reports';
import { useTheme } from '@/hooks/use-theme';
import { getApproximateLocation, LocationError } from '@/services/location';
import type { MapReport } from '@/services/reports';
import { radius, spacing } from '@/theme';
import { formatWhen } from '@/utils/history';
import { groupByLocation, type MapPlace } from '@/utils/map';
import { PLATFORM_LABELS, SCHEME_LABELS } from '@/utils/reports';

const MAP_HEIGHT = 380;

export default function MapScreen() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const reports = useMapReports();
  const places = useMemo(() => groupByLocation(reports.data ?? []), [reports.data]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const selected = places.find((p) => p.key === selectedKey) ?? null;

  const onSelect = useCallback((key: string) => setSelectedKey(key), []);
  // Each focus request gets a new number so the map moves even to the same spot again.
  const focusCount = useRef(0);
  const moveTo = (latitude: number, longitude: number) =>
    setFocus({ latitude, longitude, zoom: 11, nonce: ++focusCount.current });

  const locate = useMutation({
    mutationFn: getApproximateLocation,
    onSuccess: (c) => moveTo(c.latitude, c.longitude),
  });
  const locationError = locate.error;

  const choosePlace = (place: MapPlace<MapReport>) => {
    setSelectedKey(place.key);
    moveTo(place.latitude, place.longitude);
  };

  const total = reports.data?.length ?? 0;

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText variant="title">Map</ThemedText>
        <ThemedText color="textSecondary">
          Where approved scam reports have been seen across PNG. Locations are approximate (about 1 km).
        </ThemedText>
      </View>

      <View style={[styles.mapBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {reports.isLoading ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator color={theme.textSecondary} />
            <ThemedText color="textSecondary">Loading reports…</ThemedText>
          </View>
        ) : (
          <ReportMap places={places} dark={dark} focus={focus} onSelect={onSelect} />
        )}
      </View>

      <Button
        label="Show my area"
        variant="secondary"
        onPress={() => locate.mutate()}
        loading={locate.isPending}
        fullWidth
      />
      {locationError && (
        <FormMessage
          tone="error"
          message={locationError instanceof LocationError ? locationError.message : "Couldn't get your location."}
        />
      )}
      {locationError instanceof LocationError && locationError.needsSettings && Platform.OS !== 'web' && (
        <Button label="Open Settings" variant="secondary" onPress={() => Linking.openSettings()} />
      )}

      <AsyncState
        isLoading={false}
        error={reports.error}
        isEmpty={reports.isSuccess && total === 0}
        emptyTitle="No reports on the map yet"
        emptyMessage="Approved reports that include a location will appear here."
        onRetry={() => reports.refetch()}
        isRetrying={reports.isFetching}>
        {reports.isSuccess && (
          <ThemedText color="textSecondary" accessibilityLiveRegion="polite">
            {total} {total === 1 ? 'report' : 'reports'} at {places.length} {places.length === 1 ? 'place' : 'places'}
          </ThemedText>
        )}
      </AsyncState>

      {selected && <SelectedPlace place={selected} onClose={() => setSelectedKey(null)} />}

      {places.length > 0 && (
        <View style={styles.section}>
          <ThemedText variant="heading">Places</ThemedText>
          {places.map((place) => (
            <Pressable
              key={place.key}
              onPress={() => choosePlace(place)}
              accessibilityRole="button"
              accessibilityState={{ selected: place.key === selectedKey }}
              accessibilityLabel={`${place.reports.length} ${place.reports.length === 1 ? 'report' : 'reports'} near ${place.key}`}
              style={({ pressed }) => [
                styles.placeRow,
                {
                  backgroundColor: place.key === selectedKey ? theme.surfaceSelected : theme.surface,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <Ionicons name="location-outline" size={20} color={theme.textSecondary} />
              <View style={styles.placeText}>
                <ThemedText variant="bodyBold">
                  {place.reports.length} {place.reports.length === 1 ? 'report' : 'reports'}
                </ThemedText>
                <ThemedText variant="small" color="textSecondary">
                  Near {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)} ·{' '}
                  {[...new Set(place.reports.map((r) => SCHEME_LABELS[r.scheme_type]))].slice(0, 2).join(', ')}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <ThemedText variant="small" color="textSecondary">
        Map data © OpenStreetMap contributors.
      </ThemedText>
    </Screen>
  );
}

/** Reports at the place the user tapped on the map (or in the list). */
function SelectedPlace({ place, onClose }: { place: MapPlace<MapReport>; onClose: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.panel, { borderColor: theme.primary, backgroundColor: theme.surface }]}
      accessibilityLiveRegion="polite">
      <View style={styles.panelHeader}>
        <ThemedText variant="bodyBold" style={styles.panelTitle}>
          {place.reports.length} {place.reports.length === 1 ? 'report' : 'reports'} near {place.latitude.toFixed(2)},{' '}
          {place.longitude.toFixed(2)}
        </ThemedText>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>
      {place.reports.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => router.push({ pathname: '/report/[id]', params: { id: r.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Report: ${SCHEME_LABELS[r.scheme_type]} on ${PLATFORM_LABELS[r.platform]}. Opens the report.`}
          style={({ pressed }) => [styles.panelRow, { borderTopColor: theme.border }, pressed && styles.pressed]}>
          <View style={styles.placeText}>
            <ThemedText variant="bodyBold">{SCHEME_LABELS[r.scheme_type]}</ThemedText>
            <ThemedText variant="small" color="textSecondary">
              {PLATFORM_LABELS[r.platform]} · {formatWhen(r.created_at)}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  mapBox: {
    height: MAP_HEIGHT,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  placeText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  panel: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelTitle: {
    flex: 1,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
});
