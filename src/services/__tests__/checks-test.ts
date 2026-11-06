import type { RiskResult } from '@/utils/risk/types';

import { saveCheck } from '../checks';

let mockResult: { data: unknown; error: unknown } | Error = { data: null, error: null };
const mockCalls: [string, unknown[]][] = [];

jest.mock('../supabase', () => ({
  requireSupabase: () => ({
    from: (table: string) => {
      mockCalls.push(['from', [table]]);
      const builder = {
        insert: (...args: unknown[]) => (mockCalls.push(['insert', args]), builder),
        select: (...args: unknown[]) => (mockCalls.push(['select', args]), builder),
        single: () => (mockResult instanceof Error ? Promise.reject(mockResult) : Promise.resolve(mockResult)),
      };
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

beforeEach(() => {
  mockCalls.length = 0;
  mockResult = { data: { id: 'c1' }, error: null };
});

it('inserts the result without user_id (the database sets it) and with compact signals', async () => {
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
  await saveCheck({ ...result, input: 'x'.repeat(3000) });
  const inserted = mockCalls[1][1][0] as { input: string };
  expect(inserted.input).toHaveLength(2048);
});

it('explains database errors in plain language', async () => {
  mockResult = { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
  await expect(saveCheck(result)).rejects.toThrow("You don't have permission to do that.");
  mockResult = new TypeError('Network request failed');
  await expect(saveCheck(result)).rejects.toThrow(/Could not connect/);
});
