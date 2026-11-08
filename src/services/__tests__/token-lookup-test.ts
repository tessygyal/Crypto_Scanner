import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { TOKEN_LOOKUP_NOT_SET_UP_MESSAGE } from '@/utils/token';

import { lookupToken, TokenLookupError } from '../token-lookup';

let mockInvoke: jest.Mock;
let mockConfigured = true;

jest.mock('../supabase', () => ({
  get supabase() {
    return mockConfigured ? { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } : null;
  },
}));

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

async function failure(): Promise<TokenLookupError> {
  try {
    await lookupToken('USDT');
  } catch (e) {
    expect(e).toBeInstanceOf(TokenLookupError);
    return e as TokenLookupError;
  }
  throw new Error('expected lookupToken to throw');
}

describe('lookupToken', () => {
  it('calls the token-lookup function with only the trimmed query', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'not_found', kind: 'name' }, error: null });
    await expect(lookupToken('  PEPE ')).resolves.toEqual({ status: 'not_found', kind: 'name' });
    expect(mockInvoke).toHaveBeenCalledWith('token-lookup', { body: { query: 'PEPE' } });
  });

  it('explains when the function is not deployed or has no key', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: httpError(404) });
    expect((await failure()).message).toBe(TOKEN_LOOKUP_NOT_SET_UP_MESSAGE);
    mockInvoke.mockResolvedValue({ data: null, error: httpError(503, { error: { code: 'not_configured' } }) });
    expect((await failure()).message).toBe(TOKEN_LOOKUP_NOT_SET_UP_MESSAGE);
  });

  it('maps quota and connection errors without raw text', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: httpError(502, { error: { code: 'upstream_quota', message: 'RAW' } }) });
    const e = await failure();
    expect(e.message).toMatch(/busy/);
    expect(e.message).not.toMatch(/RAW/);
    mockInvoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new TypeError('Failed to fetch')) });
    expect((await failure()).message).toMatch(/internet connection/);
  });

  it('rejects an unexpected reply', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'found' }, error: null });
    expect((await failure()).message).toMatch(/could not be looked up/);
  });

  it('fails clearly when Supabase is not configured', async () => {
    mockConfigured = false;
    expect((await failure()).message).toMatch(/Supabase is not configured/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
