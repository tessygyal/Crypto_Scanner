/**
 * The offline cache with the real TanStack Query, the real AsyncStorage
 * persister and the app's own QueryClient settings. Only the network layer
 * (saveCheck) and AsyncStorage's native module are replaced.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MutationObserver, onlineManager, type QueryClient } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client';

import { saveCheckMutationKey } from '@/hooks/use-save-check';
import { createCachePersister, removeCachedData } from '@/services/offline-cache';
import type { RiskResult } from '@/utils/risk/types';
import { cacheStorageKey, CACHE_MAX_AGE_MS, CACHE_VERSION, shouldPersistQuery } from '@/utils/offline';

import { createQueryClient as createAppQueryClient } from '../query-provider';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- the package's official Jest mock
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => new Promise(() => {})),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));
const mockSaveCheck = jest.fn();
jest.mock('@/services/checks', () => ({ saveCheck: (r: unknown) => mockSaveCheck(r) }));
// The provider module imports auth; these tests only use createQueryClient.
jest.mock('@/context/auth-provider', () => ({ useAuth: () => ({ user: null }) }));

// Track clients so their garbage-collection timers are cleared after each test
// (7 days for queries, 5 minutes for mutations), or Jest's worker can't exit.
const clients: QueryClient[] = [];
function createQueryClient() {
  const c = createAppQueryClient();
  clients.push(c);
  return c;
}

const USER = 'user-1';
const RESULT: RiskResult = { type: 'url', input: 'https://example.com', score: 0, level: 'none', signals: [] };

// Same options the app passes to PersistQueryClientProvider.
function persistOptions(client: QueryClient, userId = USER) {
  return {
    queryClient: client,
    persister: createCachePersister(userId),
    maxAge: CACHE_MAX_AGE_MS,
    buster: CACHE_VERSION,
    dehydrateOptions: {
      shouldDehydrateQuery: (q: { state: { status: string }; queryKey: readonly unknown[] }) =>
        q.state.status === 'success' && shouldPersistQuery(q.queryKey),
    },
  };
}

async function saveAndRestore(from: QueryClient, userId = USER): Promise<QueryClient> {
  await persistQueryClientSave(persistOptions(from, userId));
  const to = createQueryClient();
  await persistQueryClientRestore(persistOptions(to, userId));
  return to;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSaveCheck.mockReset();
  onlineManager.setOnline(true);
});

afterEach(() => {
  for (const c of clients.splice(0)) {
    // clear() destroys queries but only drops mutations, leaving their timers running.
    for (const m of c.getMutationCache().getAll()) m.destroy();
    c.clear();
  }
});

afterAll(() => onlineManager.setOnline(true));

describe('saved cache', () => {
  it('restores history and reports after a restart', async () => {
    const before = createQueryClient();
    before.setQueryData(['checks', 'list', USER], { pages: [{ checks: [{ id: 'c1' }], nextPage: null }], pageParams: [0] });
    before.setQueryData(['reports', 'list', 'map'], [{ id: 'r1' }]);

    const after = await saveAndRestore(before);
    expect(after.getQueryData(['checks', 'list', USER])).toEqual({
      pages: [{ checks: [{ id: 'c1' }], nextPage: null }],
      pageParams: [0],
    });
    expect(after.getQueryData(['reports', 'list', 'map'])).toEqual([{ id: 'r1' }]);
  });

  it('does not save Google Safe Browsing answers or the status check', async () => {
    const before = createQueryClient();
    before.setQueryData(['safe-browsing', 'https://x.test'], { status: 'not_listed' });
    before.setQueryData(['supabase-health'], { ok: true });

    const after = await saveAndRestore(before);
    expect(after.getQueryData(['safe-browsing', 'https://x.test'])).toBeUndefined();
    expect(after.getQueryData(['supabase-health'])).toBeUndefined();
  });

  it("keeps each user's cache separate", async () => {
    const a = createQueryClient();
    a.setQueryData(['checks', 'list', 'a'], { pages: [], pageParams: [] });
    await persistQueryClientSave(persistOptions(a, 'a'));

    const b = createQueryClient();
    await persistQueryClientRestore(persistOptions(b, 'b'));
    expect(b.getQueryCache().getAll()).toHaveLength(0);
  });

  it('removeCachedData deletes the saved cache (sign-out on a shared phone)', async () => {
    const c = createQueryClient();
    c.setQueryData(['profile', USER], { display_name: 'T' });
    await persistQueryClientSave(persistOptions(c));
    expect(await AsyncStorage.getItem(cacheStorageKey(USER))).not.toBeNull();

    await removeCachedData(USER);
    expect(await AsyncStorage.getItem(cacheStorageKey(USER))).toBeNull();
  });

  it('keeps data for as long as the saved cache lasts', () => {
    expect(createQueryClient().getDefaultOptions().queries?.gcTime).toBeGreaterThanOrEqual(CACHE_MAX_AGE_MS);
  });
});

describe('offline saves and changes', () => {
  it('a check saved offline waits, survives a restart, and is sent when back online', async () => {
    onlineManager.setOnline(false);
    const before = createQueryClient();
    const observer = new MutationObserver<unknown, Error, RiskResult>(before, { mutationKey: saveCheckMutationKey });
    observer.mutate(RESULT).catch(() => {});
    await Promise.resolve();

    expect(observer.getCurrentResult().isPaused).toBe(true);
    expect(mockSaveCheck).not.toHaveBeenCalled();

    // App closed and reopened, still offline.
    const after = await saveAndRestore(before);
    expect(after.getMutationCache().getAll()).toHaveLength(1);

    mockSaveCheck.mockResolvedValue({ id: 'saved' });
    onlineManager.setOnline(true);
    await after.resumePausedMutations();

    expect(mockSaveCheck).toHaveBeenCalledTimes(1);
    expect(mockSaveCheck).toHaveBeenCalledWith(RESULT);
    expect(after.getMutationCache().getAll()[0].state.status).toBe('success');
  });

  it('other changes fail straight away offline instead of waiting', async () => {
    onlineManager.setOnline(false);
    const client = createQueryClient();
    const mutationFn = jest.fn().mockRejectedValue(new Error('Could not connect.'));
    const observer = new MutationObserver<unknown, Error, void>(client, { mutationFn });

    await expect(observer.mutate(undefined)).rejects.toThrow('Could not connect.');
    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().isPaused).toBe(false);
  });
});
