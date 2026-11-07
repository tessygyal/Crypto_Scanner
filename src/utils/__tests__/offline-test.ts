import {
  cacheStorageKey,
  isOfflineWithoutData,
  isOnlineFromNetworkState,
  OFFLINE_BANNER_TEXT,
  OFFLINE_NO_DATA_MESSAGE,
  SAVE_QUEUED_MESSAGE,
  shouldPersistQuery,
} from '../offline';

describe('cacheStorageKey', () => {
  it('is different for each user', () => {
    expect(cacheStorageKey('a')).not.toBe(cacheStorageKey('b'));
    expect(cacheStorageKey('a')).toContain('a');
  });
});

describe('shouldPersistQuery', () => {
  it('saves history, reports, the map list and the profile', () => {
    expect(shouldPersistQuery(['checks', 'list', 'u1'])).toBe(true);
    expect(shouldPersistQuery(['checks', 'detail', 'c1'])).toBe(true);
    expect(shouldPersistQuery(['reports', 'list', 'community', 'u1'])).toBe(true);
    expect(shouldPersistQuery(['reports', 'list', 'map'])).toBe(true);
    expect(shouldPersistQuery(['profile', 'u1'])).toBe(true);
  });

  it('does not save Google Safe Browsing answers or the status check', () => {
    expect(shouldPersistQuery(['safe-browsing', 'https://x.test'])).toBe(false);
    expect(shouldPersistQuery(['supabase-health'])).toBe(false);
    expect(shouldPersistQuery([])).toBe(false);
  });
});

describe('isOnlineFromNetworkState', () => {
  it('is offline only when the phone says so', () => {
    expect(isOnlineFromNetworkState({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isOnlineFromNetworkState({ isConnected: false, isInternetReachable: false })).toBe(false);
    // Connected to Wi-Fi with no internet (e.g. a captive portal or no data)
    expect(isOnlineFromNetworkState({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('treats unknown as online', () => {
    expect(isOnlineFromNetworkState({})).toBe(true);
    expect(isOnlineFromNetworkState({ isConnected: true })).toBe(true);
  });
});

describe('isOfflineWithoutData', () => {
  it('only when paused with nothing cached', () => {
    expect(isOfflineWithoutData({ fetchStatus: 'paused', data: undefined })).toBe(true);
    expect(isOfflineWithoutData({ fetchStatus: 'paused', data: { pages: [] } })).toBe(false);
    expect(isOfflineWithoutData({ fetchStatus: 'fetching', data: undefined })).toBe(false);
    expect(isOfflineWithoutData({ fetchStatus: 'idle', data: null })).toBe(false);
  });
});

it('offline wording gives no verdicts', () => {
  const text = [OFFLINE_BANNER_TEXT, OFFLINE_NO_DATA_MESSAGE, SAVE_QUEUED_MESSAGE].join('\n');
  for (const word of [/\bsafe\b/i, /\blegit/i, /\bscam\b/i]) expect(text).not.toMatch(word);
});
