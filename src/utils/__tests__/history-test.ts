import { formatDateTime, formatWhen, parseStoredSignals, rerunParams } from '../history';

describe('parseStoredSignals', () => {
  it('reads valid signals', () => {
    expect(
      parseStoredSignals([
        { id: 'no_https', title: 'Not a secure connection', weight: 15 },
        { id: 'official_domain', title: 'Matches X', weight: 0 },
      ])
    ).toEqual([
      { id: 'no_https', title: 'Not a secure connection', weight: 15 },
      { id: 'official_domain', title: 'Matches X', weight: 0 },
    ]);
  });

  it('skips malformed entries and defaults a bad weight to 0', () => {
    expect(
      parseStoredSignals([
        null,
        'text',
        [1, 2],
        { id: 1, title: 'x' },
        { id: 'a' },
        { id: 'b', title: 'B', weight: 'heavy' },
        { id: 'c', title: 'C', weight: 10 },
      ])
    ).toEqual([
      { id: 'b', title: 'B', weight: 0 },
      { id: 'c', title: 'C', weight: 10 },
    ]);
  });

  it('returns [] for non-arrays', () => {
    expect(parseStoredSignals(null)).toEqual([]);
    expect(parseStoredSignals({ id: 'x' })).toEqual([]);
    expect(parseStoredSignals('[]')).toEqual([]);
  });
});

describe('rerunParams', () => {
  it('re-runs a link with its original input', () => {
    expect(rerunParams({ type: 'url', input: 'http://x.xyz', signals: [] })).toEqual({ type: 'url', input: 'http://x.xyz' });
  });

  it('re-runs a scorecard from the saved "yes" answers, ignoring unknown ids', () => {
    expect(
      rerunParams({
        type: 'scheme',
        input: 'Scheme scorecard: 2 of 10 warning signs',
        signals: [
          { id: 'pressure', title: 'x', weight: 15 },
          { id: 'retired_question', title: 'x', weight: 10 },
          { id: 'guaranteed_returns', title: 'x', weight: 30 },
        ],
      })
    ).toEqual({ type: 'scheme', answers: 'guaranteed_returns,pressure' });
  });

  it('re-runs a token check with its original input (fresh CoinGecko data)', () => {
    expect(rerunParams({ type: 'token', input: 'PEPE', signals: [] })).toEqual({ type: 'token', input: 'PEPE' });
  });
});

describe('formatWhen', () => {
  const now = new Date(2026, 10, 6, 14, 0, 0); // 6 Nov 2026, 2:00 pm local

  it.each([
    [new Date(2026, 10, 6, 13, 59, 30), 'Just now'],
    [new Date(2026, 10, 6, 13, 55, 0), '5 min ago'],
    [new Date(2026, 10, 6, 11, 0, 0), '3 h ago'],
    [new Date(2026, 10, 6, 0, 30, 0), '13 h ago'],
    [new Date(2026, 10, 5, 23, 0, 0), 'Yesterday'],
    [new Date(2026, 10, 5, 0, 1, 0), 'Yesterday'],
    [new Date(2026, 10, 4, 23, 59, 0), '4 Nov'],
    [new Date(2025, 11, 25, 9, 0, 0), '25 Dec 2025'],
  ])('%s → %s', (date, text) => {
    expect(formatWhen(date.toISOString(), now)).toBe(text);
  });

  it('returns "" for an invalid date', () => {
    expect(formatWhen('not a date', now)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats local date and 12-hour time', () => {
    expect(formatDateTime(new Date(2026, 10, 6, 14, 5).toISOString())).toBe('6 Nov 2026, 2:05 pm');
    expect(formatDateTime(new Date(2026, 0, 1, 0, 0).toISOString())).toBe('1 Jan 2026, 12:00 am');
    expect(formatDateTime(new Date(2026, 0, 1, 12, 30).toISOString())).toBe('1 Jan 2026, 12:30 pm');
  });
});
