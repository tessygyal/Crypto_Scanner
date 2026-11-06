import { getProfile, updateDisplayName } from '../profile';

// A fake query builder that records the chain of calls and resolves to `mockResult`.
let mockResult: { data: unknown; error: unknown } | Error = { data: null, error: null };
const mockCalls: [string, unknown[]][] = [];
let mockConfigured = true;

function mockBuilder() {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'update']) {
    builder[method] = (...args: unknown[]) => {
      mockCalls.push([method, args]);
      return builder;
    };
  }
  for (const method of ['maybeSingle', 'single']) {
    builder[method] = () => {
      mockCalls.push([method, []]);
      return mockResult instanceof Error ? Promise.reject(mockResult) : Promise.resolve(mockResult);
    };
  }
  return builder;
}

jest.mock('../supabase', () => ({
  requireSupabase: () => {
    if (!mockConfigured) {
      const e = new Error('Supabase is not configured. Copy .env.example to .env.');
      e.name = 'SupabaseNotConfiguredError';
      throw e;
    }
    return {
      from: (table: string) => {
        mockCalls.push(['from', [table]]);
        return mockBuilder();
      },
    };
  },
}));

const profile = {
  id: 'user-1',
  display_name: 'Kila',
  created_at: '2026-11-06T00:00:00Z',
  updated_at: '2026-11-06T00:00:00Z',
};

beforeEach(() => {
  mockCalls.length = 0;
  mockConfigured = true;
  mockResult = { data: null, error: null };
});

describe('getProfile', () => {
  it('reads the profile row for the user', async () => {
    mockResult = { data: profile, error: null };
    await expect(getProfile('user-1')).resolves.toEqual(profile);
    expect(mockCalls).toEqual([
      ['from', ['profiles']],
      ['select', ['id, display_name, created_at, updated_at']],
      ['eq', ['id', 'user-1']],
      ['maybeSingle', []],
    ]);
  });

  it('returns null when there is no profile (empty state)', async () => {
    await expect(getProfile('user-1')).resolves.toBeNull();
  });

  it('explains a missing migration', async () => {
    mockResult = { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } };
    await expect(getProfile('user-1')).rejects.toThrow(/database is not set up/);
  });

  it('explains network failures', async () => {
    mockResult = new TypeError('Network request failed');
    await expect(getProfile('user-1')).rejects.toThrow(/Could not connect/);
  });

  it('explains when Supabase is not configured', async () => {
    mockConfigured = false;
    await expect(getProfile('user-1')).rejects.toThrow(/not configured/);
  });
});

describe('updateDisplayName', () => {
  it('trims and saves the new name, returning the updated profile', async () => {
    mockResult = { data: { ...profile, display_name: 'Kila T' }, error: null };
    await expect(updateDisplayName('user-1', '  Kila T ')).resolves.toMatchObject({ display_name: 'Kila T' });
    expect(mockCalls).toEqual([
      ['from', ['profiles']],
      ['update', [{ display_name: 'Kila T' }]],
      ['eq', ['id', 'user-1']],
      ['select', ['id, display_name, created_at, updated_at']],
      ['single', []],
    ]);
  });

  it('explains permission errors', async () => {
    mockResult = { data: null, error: { code: '42501', message: 'permission denied for table profiles' } };
    await expect(updateDisplayName('user-1', 'Kila')).rejects.toThrow("You don't have permission to do that.");
  });
});
