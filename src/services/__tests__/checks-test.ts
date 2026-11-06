import type { RiskResult } from '@/utils/risk/types';

import { deleteCheck, getCheck, HISTORY_PAGE_SIZE, listChecks, saveCheck } from '../checks';

/**
 * A fake Supabase query builder: records every call, and resolves to
 * `mockResult` when awaited (like the real builder) or via single/maybeSingle.
 */
let mockResult: { data: unknown; error: unknown } | Error = { data: null, error: null };
const mockCalls: [string, unknown[]][] = [];

jest.mock('../supabase', () => ({
  requireSupabase: () => ({
    from: (table: string) => {
      mockCalls.push(['from', [table]]);
      const settle = () => (mockResult instanceof Error ? Promise.reject(mockResult) : Promise.resolve(mockResult));
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => settle().then(resolve, reject),
      };
      for (const m of ['insert', 'select', 'order', 'range', 'eq', 'delete']) {
        builder[m] = (...args: unknown[]) => (mockCalls.push([m, args]), builder);
      }
      for (const m of ['single', 'maybeSingle']) {
        builder[m] = () => (mockCalls.push([m, []]), settle());
      }
      return builder;
    },
  }),
}));

const result: RiskResult = {
  type: 'url',
  input: 'http://binance-airdrop.xyz/claim',
  score: 85,
  level: 'high',
  signals: [
    { id: 'no_https', title: 'Not a secure connection', detail: 'long explanation…', weight: 15 },
    { id: 'brand_in_address', title: 'Pretends to be Binance', detail: 'long explanation…', weight: 40 },
  ],
};

const row = (n: number) => ({ id: `c${n}` });

beforeEach(() => {
  mockCalls.length = 0;
  mockResult = { data: null, error: null };
});

describe('saveCheck', () => {
  it('inserts without user_id (the database sets it) and with compact signals', async () => {
    mockResult = { data: { id: 'c1' }, error: null };
    await expect(saveCheck(result)).resolves.toEqual({ id: 'c1' });
    expect(mockCalls[0]).toEqual(['from', ['checks']]);
    expect(mockCalls[1]).toEqual([
      'insert',
      [
        {
          input: 'http://binance-airdrop.xyz/claim',
          type: 'url',
          score: 85,
          risk_level: 'high',
          signals: [
            { id: 'no_https', title: 'Not a secure connection', weight: 15 },
            { id: 'brand_in_address', title: 'Pretends to be Binance', weight: 40 },
          ],
        },
      ],
    ]);
  });

  it('truncates very long input to the database limit', async () => {
    mockResult = { data: { id: 'c1' }, error: null };
    await saveCheck({ ...result, input: 'x'.repeat(3000) });
    expect((mockCalls[1][1][0] as { input: string }).input).toHaveLength(2048);
  });

  it('explains database and network errors in plain language', async () => {
    mockResult = { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
    await expect(saveCheck(result)).rejects.toThrow("You don't have permission to do that.");
    mockResult = new TypeError('Network request failed');
    await expect(saveCheck(result)).rejects.toThrow(/Could not connect/);
  });
});

describe('listChecks', () => {
  it('asks for newest first, one extra row, and reports the next page', async () => {
    mockResult = { data: Array.from({ length: HISTORY_PAGE_SIZE + 1 }, (_, i) => row(i)), error: null };
    const page = await listChecks(0);
    expect(page.checks).toHaveLength(HISTORY_PAGE_SIZE);
    expect(page.nextPage).toBe(1);
    expect(mockCalls).toContainEqual(['order', ['created_at', { ascending: false }]]);
    expect(mockCalls).toContainEqual(['range', [0, HISTORY_PAGE_SIZE]]);
  });

  it('uses the right range for later pages and stops at the last one', async () => {
    mockResult = { data: [row(1), row(2)], error: null };
    const page = await listChecks(2);
    expect(mockCalls).toContainEqual(['range', [2 * HISTORY_PAGE_SIZE, 3 * HISTORY_PAGE_SIZE]]);
    expect(page).toEqual({ checks: [row(1), row(2)], nextPage: null });
  });

  it('returns an empty page when there is no history', async () => {
    mockResult = { data: [], error: null };
    await expect(listChecks(0)).resolves.toEqual({ checks: [], nextPage: null });
  });

  it('explains a missing migration', async () => {
    mockResult = { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } };
    await expect(listChecks(0)).rejects.toThrow(/database is not set up/);
  });
});

describe('getCheck', () => {
  it('reads one check by id', async () => {
    mockResult = { data: row(7), error: null };
    await expect(getCheck('c7')).resolves.toEqual(row(7));
    expect(mockCalls).toContainEqual(['eq', ['id', 'c7']]);
    expect(mockCalls.at(-1)).toEqual(['maybeSingle', []]);
  });

  it('returns null when it does not exist', async () => {
    await expect(getCheck('missing')).resolves.toBeNull();
  });
});

describe('deleteCheck', () => {
  it('deletes by id and confirms a row was removed', async () => {
    mockResult = { data: [{ id: 'c1' }], error: null };
    await expect(deleteCheck('c1')).resolves.toBeUndefined();
    expect(mockCalls.map((c) => c[0])).toEqual(['from', 'delete', 'eq', 'select']);
    expect(mockCalls).toContainEqual(['eq', ['id', 'c1']]);
  });

  it('explains when nothing was deleted (already gone, or not yours)', async () => {
    mockResult = { data: [], error: null };
    await expect(deleteCheck('c1')).rejects.toThrow('That item no longer exists.');
  });
});
