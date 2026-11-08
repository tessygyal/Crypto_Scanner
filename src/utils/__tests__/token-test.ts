import {
  checkTokenInput,
  formatUsd,
  parseTokenAnswer,
  TOKEN_LOOKUP_NOT_SET_UP_MESSAGE,
  tokenErrorMessage,
  tokenResult,
  tokenSignals,
  type CoinSummary,
  type TokenAnswer,
} from '../token';

type Found = Extract<TokenAnswer, { status: 'found' }>;

const coin = (over: Partial<CoinSummary> = {}): CoinSummary => ({
  id: 'tether',
  name: 'Tether',
  symbol: 'usdt',
  marketCapRank: 3,
  marketCapUsd: 1.2e11,
  volume24hUsd: 5e10,
  priceChange24hPct: 0.01,
  platforms: ['ethereum', 'tron'],
  ...over,
});
const found = (over: Partial<CoinSummary> = {}, extra: Partial<Found> = {}): Found => ({
  status: 'found',
  kind: 'address',
  matchedBy: 'address',
  sameSymbolCount: 0,
  coin: coin(over),
  ...extra,
});
const ids = (answer: TokenAnswer) => tokenSignals(answer).map((s) => s.id);

describe('checkTokenInput', () => {
  it('accepts names, symbols and EVM, Tron and Solana addresses', () => {
    expect(checkTokenInput('USDT')).toEqual({ ok: true, kind: 'name' });
    expect(checkTokenInput(' Shiba Inu ')).toEqual({ ok: true, kind: 'name' });
    expect(checkTokenInput('0xdAC17F958D2ee523a2206206994597C13D831ec7')).toEqual({ ok: true, kind: 'address' });
    expect(checkTokenInput('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')).toEqual({ ok: true, kind: 'address' });
    expect(checkTokenInput('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toEqual({ ok: true, kind: 'address' });
  });

  it('explains empty input, cut-off addresses, links and odd characters', () => {
    expect(checkTokenInput('  ')).toMatchObject({ ok: false, error: expect.stringMatching(/Type a token/) });
    expect(checkTokenInput('0xdAC17F958D2ee523')).toMatchObject({ ok: false, error: expect.stringMatching(/incomplete/) });
    expect(checkTokenInput('https://pepe-claim.xyz/')).toMatchObject({ ok: false, error: expect.stringMatching(/Link check/) });
    expect(checkTokenInput('<script>')).toMatchObject({ ok: false });
    expect(checkTokenInput('x'.repeat(51))).toMatchObject({ ok: false });
  });
});

describe('parseTokenAnswer', () => {
  it('reads valid answers', () => {
    expect(parseTokenAnswer({ status: 'not_found', kind: 'name' })).toEqual({ status: 'not_found', kind: 'name' });
    expect(parseTokenAnswer(found())).toEqual(found());
  });

  it('turns odd numbers into null and drops non-string platforms', () => {
    const parsed = parseTokenAnswer({ ...found(), coin: { ...coin(), marketCapUsd: 'big', platforms: ['ethereum', 3] } });
    expect(parsed?.status === 'found' && parsed.coin.marketCapUsd).toBeNull();
    expect(parsed?.status === 'found' && parsed.coin.platforms).toEqual(['ethereum']);
  });

  it('rejects anything else', () => {
    const bad = [null, 'x', {}, { status: 'found', kind: 'name' }, { status: 'not_found' }, { ...found(), matchedBy: 'magic' }];
    for (const data of bad) expect(parseTokenAnswer(data)).toBeNull();
  });
});

describe('tokenSignals', () => {
  it('a large, active, listed token only gets the "listed" note', () => {
    expect(tokenSignals(found())).toEqual([
      expect.objectContaining({ id: 'token_listed', title: 'Listed on CoinGecko as Tether (USDT)', weight: 0 }),
    ]);
    expect(tokenResult('0xabc', found())).toMatchObject({ type: 'token', score: 0, level: 'none' });
  });

  it('an address that is not listed is a medium-risk indicator on its own', () => {
    expect(tokenResult(' 0xabc ', { status: 'not_found', kind: 'address' })).toMatchObject({
      input: '0xabc',
      score: 35,
      level: 'medium',
    });
  });

  it('a name that is not found asks the user to check spelling or use the address', () => {
    const [signal] = tokenSignals({ status: 'not_found', kind: 'name' });
    expect(signal).toMatchObject({ id: 'token_name_not_found', weight: 20 });
    expect(signal.detail).toMatch(/contract address/);
  });

  it('flags tiny, unranked, barely traded tokens with big price swings', () => {
    const answer = found({ marketCapRank: null, marketCapUsd: 250_000, volume24hUsd: 900, priceChange24hPct: 180 });
    expect(ids(answer)).toEqual(['token_listed', 'token_tiny_market_cap', 'token_no_rank', 'token_low_volume', 'token_big_swing']);
    const result = tokenResult('PUMP', answer);
    expect(result.score).toBe(60);
    expect(result.level).toBe('high');
    expect(result.signals.find((s) => s.id === 'token_big_swing')?.title).toBe('Price went up 180% in 24 hours');
    expect(result.signals.find((s) => s.id === 'token_tiny_market_cap')?.detail).toContain('$250,000');
  });

  it('treats a missing or zero market value as unknown', () => {
    expect(ids(found({ marketCapUsd: null }))).toContain('token_unknown_market_cap');
    expect(ids(found({ marketCapUsd: 0 }))).toContain('token_unknown_market_cap');
  });

  it('warns about copycat symbols only for name searches', () => {
    expect(ids(found({}, { kind: 'name', matchedBy: 'symbol', sameSymbolCount: 4 }))).toContain('token_shared_symbol');
    expect(ids(found({}, { kind: 'name', matchedBy: 'symbol', sameSymbolCount: 1 }))).not.toContain('token_shared_symbol');
    expect(ids(found({}, { matchedBy: 'address', sameSymbolCount: 4 }))).not.toContain('token_shared_symbol');
  });

  it('the thresholds are not triggered by ordinary values', () => {
    expect(ids(found({ priceChange24hPct: -49 }))).not.toContain('token_big_swing');
    expect(ids(found({ priceChange24hPct: -50 }))).toContain('token_big_swing');
    expect(ids(found({ volume24hUsd: null }))).not.toContain('token_low_volume');
  });

  it('never uses verdict words', () => {
    const answers: TokenAnswer[] = [
      { status: 'not_found', kind: 'address' },
      { status: 'not_found', kind: 'name' },
      found(
        { marketCapRank: null, marketCapUsd: null, volume24hUsd: 1, priceChange24hPct: -90 },
        { matchedBy: 'symbol', sameSymbolCount: 3 }
      ),
      found({ marketCapUsd: 10 }),
    ];
    for (const answer of answers) {
      for (const s of tokenSignals(answer)) {
        expect(`${s.title} ${s.detail}`).not.toMatch(/\bsafe\b|\blegit|\bis a scam\b|\bnot a scam\b/i);
      }
    }
  });
});

describe('formatUsd', () => {
  it('rounds to readable amounts', () => {
    expect(formatUsd(1.234e9)).toBe('$1.2 billion');
    expect(formatUsd(3_450_000)).toBe('$3.5 million');
    expect(formatUsd(250_000.4)).toBe('$250,000');
  });
});

describe('tokenErrorMessage', () => {
  it('gives a plain message for each failure', () => {
    expect(tokenErrorMessage({ kind: 'network' })).toMatch(/connect/i);
    expect(tokenErrorMessage({ kind: 'http', status: 404 })).toBe(TOKEN_LOOKUP_NOT_SET_UP_MESSAGE);
    expect(tokenErrorMessage({ kind: 'http', status: 503, code: 'not_configured' })).toBe(TOKEN_LOOKUP_NOT_SET_UP_MESSAGE);
    expect(tokenErrorMessage({ kind: 'http', status: 502, code: 'upstream_quota' })).toMatch(/busy/);
    expect(tokenErrorMessage({ kind: 'http', status: 401 })).toMatch(/sign in/);
    expect(tokenErrorMessage({ kind: 'http', status: 400 })).toMatch(/name or address/);
    expect(tokenErrorMessage({ kind: 'http', status: 502 })).toMatch(/not responding/);
  });
});
