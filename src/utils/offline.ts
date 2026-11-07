import type { QueryKey } from '@tanstack/react-query';

/** How long cached data is kept on the phone before it is thrown away. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Bump when the shape of cached data changes, so old caches are discarded
 * instead of being read with the wrong shape.
 */
export const CACHE_VERSION = 'v1';

/** Each user's cache is stored under its own key, so one user never sees another's data. */
export function cacheStorageKey(userId: string): string {
  return `scam-detector:query-cache:${CACHE_VERSION}:${userId}`;
}

/**
 * Which queries are saved to the phone. History, reports, the map list and the
 * profile are; Google Safe Browsing answers and the Supabase status check are not
 * (they are only meaningful live).
 */
const PERSISTED_ROOTS = new Set(['checks', 'reports', 'profile']);

export function shouldPersistQuery(queryKey: QueryKey): boolean {
  return typeof queryKey[0] === 'string' && PERSISTED_ROOTS.has(queryKey[0]);
}

/** Subset of expo-network's NetworkState that we use. */
export type NetworkStateLike = { isConnected?: boolean; isInternetReachable?: boolean };

/**
 * Online unless the phone says otherwise. Unknown values (undefined, e.g. while
 * Android is still checking) count as online, so requests aren't held back.
 */
export function isOnlineFromNetworkState(state: NetworkStateLike): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

/**
 * True when a query can't run because the phone is offline and nothing is
 * cached yet. (With cached data the screen shows that instead.)
 */
export function isOfflineWithoutData(query: { fetchStatus: string; data: unknown }): boolean {
  return query.fetchStatus === 'paused' && query.data === undefined;
}

export const OFFLINE_BANNER_TEXT = "You're offline. Showing what was saved on this phone.";
export const OFFLINE_NO_DATA_TITLE = "You're offline";
export const OFFLINE_NO_DATA_MESSAGE = 'This hasn’t been saved on this phone yet. It will load when you’re back online.';
export const SAVE_QUEUED_MESSAGE = "You're offline. This check will be saved to your history when you're back online.";
