import * as Location from 'expo-location';

import { getApproximateLocation, LocationError } from '../location';

jest.mock('expo-location', () => ({
  Accuracy: { Low: 2 },
  hasServicesEnabledAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

const L = Location as jest.Mocked<typeof Location>;
const granted = { granted: true, canAskAgain: true, status: 'granted' } as Location.LocationPermissionResponse;
const denied = (canAskAgain: boolean) =>
  ({ granted: false, canAskAgain, status: 'denied' }) as Location.LocationPermissionResponse;
const position = (latitude: number, longitude: number) =>
  ({ coords: { latitude, longitude } }) as Location.LocationObject;

beforeEach(() => {
  jest.resetAllMocks();
  L.hasServicesEnabledAsync.mockResolvedValue(true);
  L.getForegroundPermissionsAsync.mockResolvedValue(granted);
  L.getCurrentPositionAsync.mockResolvedValue(position(-9.443812, 147.180391));
});

it('returns the position rounded to about 1 km, using low accuracy', async () => {
  await expect(getApproximateLocation()).resolves.toEqual({ latitude: -9.44, longitude: 147.18 });
  expect(L.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Low });
  expect(L.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

it('asks for permission when it has not been decided yet', async () => {
  L.getForegroundPermissionsAsync.mockResolvedValue(denied(true));
  L.requestForegroundPermissionsAsync.mockResolvedValue(granted);
  await expect(getApproximateLocation()).resolves.toEqual({ latitude: -9.44, longitude: 147.18 });
  expect(L.requestForegroundPermissionsAsync).toHaveBeenCalled();
});

it('explains a refused permission (can ask again)', async () => {
  L.getForegroundPermissionsAsync.mockResolvedValue(denied(true));
  L.requestForegroundPermissionsAsync.mockResolvedValue(denied(true));
  const error = await getApproximateLocation().catch((e) => e);
  expect(error).toBeInstanceOf(LocationError);
  expect(error.message).toMatch(/not given/);
  expect(error.needsSettings).toBe(false);
});

it('points to Settings when the permission is blocked', async () => {
  L.getForegroundPermissionsAsync.mockResolvedValue(denied(false));
  const error = await getApproximateLocation().catch((e) => e);
  expect(error.message).toMatch(/Settings/);
  expect(error.needsSettings).toBe(true);
  expect(L.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

it('explains when location services are off', async () => {
  L.hasServicesEnabledAsync.mockResolvedValue(false);
  await expect(getApproximateLocation()).rejects.toThrow(/turned off/);
});

it('falls back to the last known position when the current one fails', async () => {
  L.getCurrentPositionAsync.mockRejectedValue(new Error('timeout'));
  L.getLastKnownPositionAsync.mockResolvedValue(position(-6.7275, 146.9961));
  await expect(getApproximateLocation()).resolves.toEqual({ latitude: -6.73, longitude: 147 });
});

it('explains when no position is available at all', async () => {
  L.getCurrentPositionAsync.mockRejectedValue(new Error('timeout'));
  L.getLastKnownPositionAsync.mockResolvedValue(null);
  await expect(getApproximateLocation()).rejects.toThrow(/Couldn't find your location/);
});
