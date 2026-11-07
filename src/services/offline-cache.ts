import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

import { cacheStorageKey, isOnlineFromNetworkState } from '@/utils/offline';

/**
 * Where TanStack Query saves its cache on the phone (AsyncStorage; the
 * browser's localStorage on web). One key per user.
 */
export function createCachePersister(userId: string) {
  return createAsyncStoragePersister({ storage: AsyncStorage, key: cacheStorageKey(userId) });
}

/** Delete a user's saved cache, e.g. after they sign out on a shared phone. */
export async function removeCachedData(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheStorageKey(userId));
  } catch {
    // Nothing useful to do; the cache also expires on its own.
  }
}

let watching = false;

/**
 * Tell TanStack Query when the phone goes offline or comes back, using
 * expo-network. Offline, queries pause (cached data stays on screen) and
 * paused saves resume automatically when the connection returns.
 */
export function watchNetworkState(): void {
  if (watching) return;
  watching = true;
  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync()
      .then((state) => setOnline(isOnlineFromNetworkState(state)))
      .catch(() => {});
    const subscription = Network.addNetworkStateListener((state) => setOnline(isOnlineFromNetworkState(state)));
    return () => subscription.remove();
  });
}
