import { analyzeScheme } from '@/utils/risk/scheme-scorecard';
import { analyzeUrl } from '@/utils/risk/url-analysis';
import type { RiskResult } from '@/utils/risk/types';

import {
  LISTED_WEIGHT,
  parseSafeBrowsingAnswer,
  SAFE_BROWSING_NOT_SET_UP_MESSAGE,
  safeBrowsingErrorMessage,
  safeBrowsingSignal,
  safeBrowsingTarget,
  withSafeBrowsing,
  type SafeBrowsingFailure,
  type SafeBrowsingOutcome,
} from '../safe-browsing';

function urlResult(link: string): RiskResult {
  const a = analyzeUrl(link);
  if (!a.ok) throw new Error(a.error);
  return a.result;
}

describe('safeBrowsingTarget', () => {
  it('looks up normal links', () => {
    expect(safeBrowsingTarget(urlResult('https://example.com'))).toBe('https://example.com');
    expect(safeBrowsingTarget(urlResult('binance-bonus.xyz'))).toBe('binance-bonus.xyz');
  });

  it('skips scorecard checks and javascript:/data: links', () => {
    expect(safeBrowsingTarget(analyzeScheme([]))).toBeNull();
    expect(safeBrowsingTarget(urlResult('javascript:alert(1)'))).toBeNull();
  });
});

describe('withSafeBrowsing', () => {
  it('a Google listing alone gives "high"', () => {
    const offline = urlResult('https://example.com');
    expect(offline.level).toBe('none');
    const merged = withSafeBrowsing(offline, { status: 'listed', threats: ['SOCIAL_ENGINEERING'] });
    expect(merged.level).toBe('high');
    expect(merged.score).toBe(LISTED_WEIGHT);
    expect(merged.signals.map((s) => s.id)).toContain('safe_browsing_listed');
  });

  it('"not listed" and "unavailable" add a note but do not change the score', () => {
    const offline = urlResult('http://192.168.1.10/login');
    for (const status of ['not_listed', 'unavailable'] as const) {
      const merged = withSafeBrowsing(offline, { status });
      expect(merged.score).toBe(offline.score);
      expect(merged.level).toBe(offline.level);
      expect(merged.signals).toHaveLength(offline.signals.length + 1);
    }
  });

  it('keeps the offline indicators and caps the score at 100', () => {
    const offline = urlResult('http://binance-verify-wallet.xyz@192.168.0.1/claim-airdrop');
    const merged = withSafeBrowsing(offline, { status: 'listed', threats: ['MALWARE'] });
    expect(merged.signals.slice(0, offline.signals.length)).toEqual(offline.signals);
    expect(merged.score).toBeLessThanOrEqual(100);
  });

  it('does not add Google twice when applied again', () => {
    const once = withSafeBrowsing(urlResult('https://example.com'), { status: 'unavailable' });
    const twice = withSafeBrowsing(once, { status: 'listed', threats: [] });
    expect(twice.signals.filter((s) => s.id.startsWith('safe_browsing_'))).toHaveLength(1);
    expect(twice.level).toBe('high');
  });

  it('does not change the original result', () => {
    const offline = urlResult('https://example.com');
    const before = JSON.stringify(offline);
    withSafeBrowsing(offline, { status: 'listed', threats: ['MALWARE'] });
    expect(JSON.stringify(offline)).toBe(before);
  });
});

describe('safeBrowsingSignal', () => {
  it('names the threat types in plain language', () => {
    const s = safeBrowsingSignal({ status: 'listed', threats: ['SOCIAL_ENGINEERING', 'MALWARE'] });
    expect(s.detail).toMatch(/phishing/);
    expect(s.detail).toMatch(/malware/);
  });

  it('still explains a listing with unknown threat types', () => {
    expect(safeBrowsingSignal({ status: 'listed', threats: ['NEW_TYPE'] }).detail).toMatch(/security threat/);
  });

  it('never gives a verdict (the product name "Safe Browsing" is allowed)', () => {
    const BANNED = [/\bsafe\b(?![ -]browsing)/i, /\bsafely\b/i, /\blegit/i, /\bis a scam\b/i, /\bnot a scam\b/i];
    const outcomes: SafeBrowsingOutcome[] = [
      { status: 'listed', threats: ['SOCIAL_ENGINEERING', 'MALWARE', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'] },
      { status: 'not_listed' },
      { status: 'unavailable' },
    ];
    const failures: SafeBrowsingFailure[] = [
      { kind: 'network' },
      { kind: 'other' },
      { kind: 'not_configured_app' },
      { kind: 'http', status: 401 },
      { kind: 'http', status: 404 },
      { kind: 'http', status: 400 },
      { kind: 'http', status: 502, code: 'upstream_quota' },
      { kind: 'http', status: 502 },
    ];
    const text = [
      ...outcomes.flatMap((o) => [safeBrowsingSignal(o).title, safeBrowsingSignal(o).detail]),
      ...failures.map(safeBrowsingErrorMessage),
    ].join('\n');
    for (const word of BANNED) expect(text).not.toMatch(word);
  });

  it('"not listed" says it is not proof', () => {
    expect(safeBrowsingSignal({ status: 'not_listed' }).detail).toMatch(/not proof/);
  });
});

describe('safeBrowsingErrorMessage', () => {
  it('explains a missing function or API key', () => {
    expect(safeBrowsingErrorMessage({ kind: 'http', status: 404 })).toBe(SAFE_BROWSING_NOT_SET_UP_MESSAGE);
    expect(safeBrowsingErrorMessage({ kind: 'http', status: 503, code: 'not_configured' })).toBe(
      SAFE_BROWSING_NOT_SET_UP_MESSAGE
    );
  });

  it('handles network, session and quota failures', () => {
    expect(safeBrowsingErrorMessage({ kind: 'network' })).toMatch(/internet connection/);
    expect(safeBrowsingErrorMessage({ kind: 'http', status: 401 })).toMatch(/sign in again/);
    expect(safeBrowsingErrorMessage({ kind: 'http', status: 502, code: 'upstream_quota' })).toMatch(/later/);
  });
});

describe('parseSafeBrowsingAnswer', () => {
  it('accepts the two valid shapes', () => {
    expect(parseSafeBrowsingAnswer({ status: 'not_listed' })).toEqual({ status: 'not_listed' });
    expect(parseSafeBrowsingAnswer({ status: 'listed', threats: ['MALWARE', 3] })).toEqual({
      status: 'listed',
      threats: ['MALWARE'],
    });
  });

  it('rejects anything else', () => {
    for (const data of [null, 'listed', {}, { status: 'listed' }, { status: 'safe' }]) {
      expect(parseSafeBrowsingAnswer(data)).toBeNull();
    }
  });
});
