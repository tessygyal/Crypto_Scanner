import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

import { SAFE_BROWSING_NOT_SET_UP_MESSAGE } from '@/utils/safe-browsing';

import { lookupSafeBrowsing, SafeBrowsingError } from '../safe-browsing';

let mockInvoke: jest.Mock;
let mockConfigured = true;

jest.mock('../supabase', () => ({
  get supabase() {
    return mockConfigured ? { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } : null;
  },
}));

/** A stand-in for the fetch Response that FunctionsHttpError carries. */
function httpError(status: number, body?: unknown) {
  return new FunctionsHttpError({
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError('not json');
      return body;
    },
  });
}

beforeEach(() => {
  mockConfigured = true;
  mockInvoke = jest.fn();
});

async function failure(): Promise<SafeBrowsingError> {
  try {
    await lookupSafeBrowsing('https://example.com');
  } catch (e) {
    expect(e).toBeInstanceOf(SafeBrowsingError);
    return e as SafeBrowsingError;
  }
  throw new Error('expected lookupSafeBrowsing to throw');
}

describe('lookupSafeBrowsing', () => {
  it('calls the safe-browsing function with only the link', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'not_listed' }, error: null });
    await expect(lookupSafeBrowsing('https://example.com')).resolves.toEqual({ status: 'not_listed' });
    expect(mockInvoke).toHaveBeenCalledWith('safe-browsing', { body: { url: 'https://example.com' } });
  });

  it('returns a listing', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'listed', threats: ['SOCIAL_ENGINEERING'] }, error: null });
    await expect(lookupSafeBrowsing('http://x.test')).resolves.toEqual({
      status: 'listed',
      threats: ['SOCIAL_ENGINEERING'],
    });
  });

  it('explains when the function is not deployed or has no API key', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: httpError(404) });
    expect((await failure()).message).toBe(SAFE_BROWSING_NOT_SET_UP_MESSAGE);

    mockInvoke.mockResolvedValue({ data: null, error: httpError(503, { error: { code: 'not_configured' } }) });
    expect((await failure()).message).toBe(SAFE_BROWSING_NOT_SET_UP_MESSAGE);
  });

  it('maps quota, session and server errors without showing raw text', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: httpError(502, { error: { code: 'upstream_quota', message: 'RAW' } }) });
    expect((await failure()).message).toMatch(/later/);

    mockInvoke.mockResolvedValue({ data: null, error: httpError(401, { msg: 'Invalid JWT' }) });
    expect((await failure()).message).toMatch(/sign in again/);

    mockInvoke.mockResolvedValue({ data: null, error: httpError(500) });
    const e = await failure();
    expect(e.message).toMatch(/not responding/);
    expect(e.message).not.toMatch(/RAW|JWT/);
  });

  it('treats fetch and relay errors as connection problems', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new TypeError('Failed to fetch')) });
    expect((await failure()).message).toMatch(/internet connection/);

    mockInvoke.mockResolvedValue({ data: null, error: new FunctionsRelayError({}) });
    expect((await failure()).message).toMatch(/not responding/);

    mockInvoke.mockRejectedValue(new TypeError('Network request failed'));
    expect((await failure()).message).toMatch(/internet connection/);
  });

  it('rejects an unexpected reply', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'maybe' }, error: null });
    expect((await failure()).message).toMatch(/could not be checked/);
  });

  it('fails clearly when Supabase is not configured, without calling anything', async () => {
    mockConfigured = false;
    expect((await failure()).message).toMatch(/Supabase is not configured/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
