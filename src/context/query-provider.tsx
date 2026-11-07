import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { useAuth } from '@/context/auth-provider';
import { registerSaveCheckDefaults } from '@/hooks/use-save-check';
import { createCachePersister, removeCachedData, watchNetworkState } from '@/services/offline-cache';
import { CACHE_MAX_AGE_MS, CACHE_VERSION, shouldPersistQuery } from '@/utils/offline';

export function createQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 2,
        // Keep data at least as long as the saved cache, or it is dropped on restore.
        gcTime: CACHE_MAX_AGE_MS,
      },
      mutations: {
        retry: 0,
        // Changes (reports, deletes) fail straight away when offline, with the
        // normal "Could not connect" error, instead of waiting silently.
        // Saving a check is the exception: it waits and resumes (see use-save-check).
        networkMode: 'always',
      },
    },
  });
  registerSaveCheckDefaults(client);
  return client;
}

watchNetworkState();

/**
 * TanStack Query for the whole app, with an offline cache.
 *
 * - Signed in: the cache is saved on the phone under that user's own key and
 *   restored on the next start, so history and reports open offline. Checks
 *   saved while offline wait and are sent when the connection returns.
 * - Signed out: nothing is saved, and the previous user's saved cache is deleted.
 * - On Android/iOS, queries refetch when the app returns to the foreground.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // A fresh client per user, so one user's cached data is never shown to another.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- userId is the reason to rebuild
  const client = useMemo(() => createQueryClient(), [userId]);
  const persister = useMemo(() => (userId ? createCachePersister(userId) : null), [userId]);

  usePreviousUserCleanup(userId);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  if (!userId || !persister) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      key={userId}
      client={client}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: CACHE_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success' && shouldPersistQuery(query.queryKey),
          // Paused (offline) saves are kept by default, so they survive an app restart.
        },
      }}
      // After restoring, send any checks that were saved while offline.
      onSuccess={() => client.resumePausedMutations()}>
      {children}
    </PersistQueryClientProvider>
  );
}

/** When the signed-in user changes or signs out, delete the previous user's saved cache. */
function usePreviousUserCleanup(userId: string | null) {
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const prev = previous.current;
    previous.current = userId;
    if (!prev || prev === userId) return;
    // Wait past the persister's 1 s write throttle so a last pending write can't
    // recreate it. Not cancelled on re-render: the old user's data must always go.
    setTimeout(() => removeCachedData(prev), 1500);
  }, [userId]);
}
