// Tests for the token-lookup Edge Function's pure logic. Run: npm run test:functions
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  API_BASE,
  coinUrl,
  contractUrl,
  EVM_PLATFORMS,
  parseInput,
  pickSearchMatch,
  searchUrl,
  summariseCoin,
} from '../functions/token-lookup/logic.ts';

const EVM = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

describe('parseInput', () => {
  it('treats 0x addresses as EVM tokens and lower-cases them', () => {
    assert.deepEqual(parseInput({ query: ` ${EVM} ` }), {
      ok: true,
      query: { kind: 'address', address: EVM.toLowerCase(), platforms: [...EVM_PLATFORMS] },
    });
  });

  it('recognises Tron and Solana addresses', () => {
    const tron = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    assert.deepEqual(parseInput({ query: tron }), { ok: true, query: { kind: 'address', address: tron, platforms: ['tron'] } });
    const sol = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    assert.deepEqual(parseInput({ query: sol }), { ok: true, query: { kind: 'address', address: sol, platforms: ['solana'] } });
  });

  it('treats other text as a name or symbol', () => {
    assert.deepEqual(parseInput({ query: 'USDT' }), { ok: true, query: { kind: 'name', text: 'USDT' } });
    assert.deepEqual(parseInput({ query: 'Shiba Inu' }), { ok: true, query: { kind: 'name', text: 'Shiba Inu' } });
  });

  it('rejects bad bodies, links, symbols and long text', () => {
    for (const body of [null, 'USDT', [], {}, { query: '' }, { query: '  ' }, { query: 5 }]) {
      assert.equal(parseInput(body).ok, false, JSON.stringify(body));
    }
    for (const query of ['https://evil.xyz', '<script>', 'a/b', 'x'.repeat(51), '0x1234']) {
      assert.equal(parseInput({ query }).ok, false, query);
    }
  });
});

describe('URLs', () => {
  it('use the Demo API base and encode user text', () => {
    assert.equal(searchUrl('shiba inu'), `${API_BASE}/search?query=shiba%20inu`);
    assert.equal(contractUrl('ethereum', '0xabc'), `${API_BASE}/coins/ethereum/contract/0xabc`);
    assert.match(coinUrl('tether'), /\/coins\/tether\?.*tickers=false/);
    assert.doesNotMatch(coinUrl('tether') + searchUrl('x'), /key/i);
  });
});

describe('pickSearchMatch', () => {
  const coins = [
    { id: 'tether', name: 'Tether', symbol: 'USDT' },
    { id: 'tether-fake', name: 'Tether Gold Plus', symbol: 'USDT' },
    { id: 'usdt-plus', name: 'USDT+', symbol: 'USDT+' },
  ];

  it('prefers the first (largest) exact symbol match and counts copycats', () => {
    assert.deepEqual(pickSearchMatch({ coins }, 'usdt'), { id: 'tether', matchedBy: 'symbol', sameSymbolCount: 2 });
  });

  it('falls back to an exact name match', () => {
    assert.deepEqual(pickSearchMatch({ coins }, 'Tether Gold Plus'), {
      id: 'tether-fake',
      matchedBy: 'name',
      sameSymbolCount: 0,
    });
  });

  it('ignores partial matches and malformed replies', () => {
    assert.equal(pickSearchMatch({ coins }, 'teth'), null);
    assert.equal(pickSearchMatch({ coins: [] }, 'usdt'), null);
    assert.equal(pickSearchMatch({ coins: [{ id: 1 }] }, 'usdt'), null);
    assert.equal(pickSearchMatch(null, 'usdt'), null);
    assert.equal(pickSearchMatch({}, 'usdt'), null);
  });
});

describe('summariseCoin', () => {
  it('keeps only the facts the app needs', () => {
    const summary = summariseCoin({
      id: 'tether',
      name: 'Tether',
      symbol: 'usdt',
      market_cap_rank: 3,
      platforms: { ethereum: '0xdac', tron: 'TR7', '': '' },
      description: { en: 'long text' },
      market_data: {
        market_cap: { usd: 1.2e11, eur: 1 },
        total_volume: { usd: 5e10 },
        price_change_percentage_24h: -0.02,
      },
    });
    assert.deepEqual(summary, {
      id: 'tether',
      name: 'Tether',
      symbol: 'usdt',
      marketCapRank: 3,
      marketCapUsd: 1.2e11,
      volume24hUsd: 5e10,
      priceChange24hPct: -0.02,
      platforms: ['ethereum', 'tron'],
    });
  });

  it('uses null for missing market data', () => {
    const s = summariseCoin({ id: 'x', name: 'X', symbol: 'x', market_cap_rank: null, market_data: { market_cap: {} } });
    assert.equal(s.marketCapRank, null);
    assert.equal(s.marketCapUsd, null);
    assert.equal(s.volume24hUsd, null);
    assert.equal(s.priceChange24hPct, null);
    assert.deepEqual(s.platforms, []);
  });

  it('returns null for error replies', () => {
    assert.equal(summariseCoin({ error: 'coin not found' }), null);
    assert.equal(summariseCoin(null), null);
    assert.equal(summariseCoin([]), null);
  });
});
