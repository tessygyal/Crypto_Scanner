import { analyzeScheme, cleanSchemeAnswers, SCHEME_QUESTIONS } from '../scheme-scorecard';
import { LEVEL_COPY, levelForScore, scoreSignals } from '../scoring';
import { analyzeUrl } from '../url-analysis';

describe('levels', () => {
  it.each([
    [0, 'none'],
    [1, 'low'],
    [24, 'low'],
    [25, 'medium'],
    [49, 'medium'],
    [50, 'high'],
    [100, 'high'],
  ] as const)('score %i → %s', (score, level) => {
    expect(levelForScore(score)).toBe(level);
  });

  it('adds weights, ignores negatives and caps at 100', () => {
    const s = (weight: number) => ({ id: 'x', title: 'x', detail: 'x', weight });
    expect(scoreSignals([s(10), s(15)]).score).toBe(25);
    expect(scoreSignals([s(-50), s(10)]).score).toBe(10);
    expect(scoreSignals([s(80), s(80)]).score).toBe(100);
  });
});

describe('scheme scorecard', () => {
  it('has 10 questions with unique ids', () => {
    expect(SCHEME_QUESTIONS).toHaveLength(10);
    expect(new Set(SCHEME_QUESTIONS.map((q) => q.id)).size).toBe(10);
  });

  it('no "yes" answers: no known warnings', () => {
    expect(analyzeScheme([])).toMatchObject({
      type: 'scheme',
      score: 0,
      level: 'none',
      signals: [],
      input: 'Scheme scorecard: 0 of 10 warning signs',
    });
  });

  it('asking for a recovery phrase alone is high risk', () => {
    expect(analyzeScheme(['secret_phrase'])).toMatchObject({ score: 50, level: 'high' });
  });

  it('a stranger making contact alone is low', () => {
    expect(analyzeScheme(['stranger_contact']).level).toBe('low');
  });

  it('typical Ponzi pattern is high', () => {
    const result = analyzeScheme(['guaranteed_returns', 'recruit_others', 'personal_account']);
    expect(result.level).toBe('high');
    expect(result.signals.map((s) => s.id)).toEqual(['guaranteed_returns', 'recruit_others', 'personal_account']);
    expect(result.input).toBe('Scheme scorecard: 3 of 10 warning signs');
  });

  it('ignores unknown ids and keeps question order', () => {
    expect(cleanSchemeAnswers(['pressure', 'made_up', 'guaranteed_returns', 'pressure'])).toEqual([
      'guaranteed_returns',
      'pressure',
    ]);
    expect(analyzeScheme(['made_up']).score).toBe(0);
  });
});

describe('wording rules', () => {
  // The app reports indicators, not verdicts.
  const BANNED = [/\bsafe\b/i, /\bsafely\b/i, /\blegit/i, /\bis a scam\b/i, /\bnot a scam\b/i, /\bguaranteed safe\b/i];

  const sampleUrls = [
    'https://example.com', 'http://example.com', 'https://binance.com@evil.xyz', 'http://185.23.44.10/',
    'https://xn--bnance-6va.com', 'https://example.com:8443', 'https://bit.ly/x', 'https://a.xyz',
    'https://this-is-a-really-long-website-name-for-testing.com', 'https://a.b.c.example.com',
    'https://secure-login-wallet.com', 'https://b1nance.com', 'https://binance.xyz', 'https://binance-airdrop.com',
    'https://www.binance.com', 'https://example.com/airdrop', 'javascript:alert(1)',
  ];

  const texts = [
    ...Object.values(LEVEL_COPY).flatMap((c) => [c.label, c.summary, ...c.advice]),
    ...SCHEME_QUESTIONS.flatMap((q) => [q.question, q.title, q.detail]),
    ...sampleUrls.flatMap((u) => {
      const a = analyzeUrl(u);
      return a.ok ? a.result.signals.flatMap((s) => [s.title, s.detail]) : [a.error];
    }),
    ...['', 'hello', 'ftp://x.com'].map((u) => {
      const a = analyzeUrl(u);
      return a.ok ? '' : a.error;
    }),
  ];

  it('checks a meaningful amount of text', () => {
    expect(texts.length).toBeGreaterThan(60);
  });

  it.each(BANNED.map((r) => [r.source, r] as const))('never uses %s', (_name, pattern) => {
    const offending = texts.filter((t) => pattern.test(t));
    expect(offending).toEqual([]);
  });

  it('labels use "risk indicators" or "no known warnings found"', () => {
    for (const { label } of Object.values(LEVEL_COPY)) {
      expect(label).toMatch(/risk indicators|No known warnings found/);
    }
  });
});
