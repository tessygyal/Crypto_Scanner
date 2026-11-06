import * as Location from 'expo-location';

import { roundCoordinate } from '@/utils/reports';

export type Coordinates = { latitude: number; longitude: number };

/** An Error whose message is safe to show, plus whether asking again could help. */
export class LocationError extends Error {
  constructor(
    message: string,
    /** True when the user has blocked the permission and must change it in Settings. */
    readonly needsSettings = false
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

const TIMEOUT_MS = 15_000;

/**
 * The device's approximate location, rounded to about 1 km so a report never
 * reveals where someone lives. Asks for permission if needed.
 */
export async function getApproximateLocation(): Promise<Coordinates> {
  if (!(await Location.hasServicesEnabledAsync().catch(() => true))) {
    throw new LocationError('Location is turned off on this device. Turn it on and try again.');
  }

  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (!permission.granted) {
    throw permission.canAskAgain
      ? new LocationError('Location permission was not given.')
      : new LocationError(
          'Location is blocked for this app. You can allow it in your phone Settings.',
          true
        );
  }

  // Try a fresh position (with a time limit); if that fails or times out,
  // fall back to the last known one.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let position = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }).catch(() => null),
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timer);
  position ??= await Location.getLastKnownPositionAsync().catch(() => null);
  if (!position) {
    throw new LocationError("Couldn't find your location. Try again outside or near a window.");
  }

  return {
    latitude: roundCoordinate(position.coords.latitude),
    longitude: roundCoordinate(position.coords.longitude),
  };
}
