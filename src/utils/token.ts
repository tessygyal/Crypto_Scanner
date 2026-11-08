import { NETWORK_ERROR_MESSAGE } from '@/utils/auth-errors';
import type { FunctionFailure } from '@/utils/function-errors';
import { scoreSignals } from '@/utils/risk/scoring';
import type { RiskResult, Signal } from '@/utils/risk/types';

/**
 * CoinGecko token lookup: input checks, the answer from the token-lookup Edge
 * Function (supabase/functions/token-lookup), and turning it into risk indicators.
 * The weights were proposed by AI and should be reviewed against real PNG examples.
 */

export type CoinSummary = {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  priceChange24hPct: number | null;
  platforms: string[];
};

export type TokenAnswer =
  | { status: 'not_found'; kind: 'address' | 'name' }
  | {
      status: 'found';
      kind: 'address' | 'name';
      matchedBy: 'address' | 'symbol' | 'name';
      sameSymbolCount: number;
      coin: CoinSummary;
    };

// --- Input (same rules as the Edge Function's parseInput) -----------------------

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const NAME = /^[\p{L}\p{N} .\-_$]{1,50}$/u;

export type TokenInputCheck = { ok: true; kind: 'address' | 'name' } | { ok: false; error: string };

export function checkTokenInput(raw: string): TokenInputCheck {
  const text = raw.trim();
  if (!text) return { ok: false, error: 'Type a token name, symbol or contract address.' };
  if (EVM_ADDRESS.test(text) || TRON_ADDRESS.test(text) || (text.length >= 32 && SOLANA_ADDRESS.test(text))) {
    return { ok: true, kind: 'address' };
  }
  if (/^0x[0-9a-f]*$/i.test(text)) {
    return { ok: false, error: 'That address looks incomplete. A 0x address has 42 characters — copy it again.' };
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /\.[a-z]{2,}\//i.test(text)) {
    return { ok: false, error: 'That looks like a link. Use the Link check for links.' };
  }
  if (!NAME.test(text)) {
    return { ok: false, error: 'Use only letters, numbers and spaces (up to 50), or paste a contract address.' };
  }
  return { ok: true, kind: 'name' };
}

// --- Reading the function's reply -----------------------------------------------

const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Check the function's reply really is a TokenAnswer. */
export function parseTokenAnswer(data: unknown): TokenAnswer | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const kind = d.kind === 'address' || d.kind === 'name' ? d.kind : null;
  if (!kind) return null;
  if (d.status === 'not_found') return { status: 'not_found', kind };
  if (d.status !== 'found' || !d.coin || typeof d.coin !== 'object') return null;

  const c = d.coin as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.name !== 'string' || typeof c.symbol !== 'string') return null;
  const matchedBy = d.matchedBy === 'address' || d.matchedBy === 'symbol' || d.matchedBy === 'name' ? d.matchedBy : null;
  if (!matchedBy) return null;
  return {
    status: 'found',
    kind,
    matchedBy,
    sameSymbolCount: numOrNull(d.sameSymbolCount) ?? 0,
    coin: {
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      marketCapRank: numOrNull(c.marketCapRank),
      marketCapUsd: numOrNull(c.marketCapUsd),
      volume24hUsd: numOrNull(c.volume24hUsd),
      priceChange24hPct: numOrNull(c.priceChange24hPct),
      platforms: Array.isArray(c.platforms) ? c.platforms.filter((p): p is string => typeof p === 'string') : [],
    },
  };
}

// --- Risk indicators ------------------------------------------------------------

export const TOKEN_WEIGHTS = {
  notListedAddress: 35,
  notListedName: 20,
  tinyMarketCap: 20,
  unknownMarketCap: 15,
  lowVolume: 15,
  bigSwing: 15,
  noRank: 10,
  sharedSymbol: 10,
} as const;

/** Under this market value (USD) a token is very small and easy to manipulate. */
export const TINY_MARKET_CAP_USD = 1_000_000;
/** Under this 24 h trading volume (USD) it may be hard to sell. */
export const LOW_VOLUME_USD = 10_000;
/** A price move this large (either way) in 24 h. */
export const BIG_SWING_PCT = 50;

/** "$1.2 billion", "$350,000", "$12". */
export function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)} billion`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)} million`;
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function tokenSignals(answer: TokenAnswer): Signal[] {
  if (answer.status === 'not_found') {
    return answer.kind === 'address'
      ? [
          {
            id: 'token_not_listed',
            title: 'Contract address not on CoinGecko',
            detail:
              'CoinGecko, a large crypto price tracker, has no token at this address on Ethereum, BNB Chain, Polygon, Base, Tron or Solana. Many scam tokens are never listed, and a token that is not listed can be hard or impossible to sell.',
            weight: TOKEN_WEIGHTS.notListedAddress,
          },
        ]
      : [
          {
            id: 'token_name_not_found',
            title: 'No token with this exact name or symbol on CoinGecko',
            detail:
              'Check the spelling. If you were given a contract address, check that instead — it is more reliable than a name, which anyone can copy.',
            weight: TOKEN_WEIGHTS.notListedName,
          },
        ];
  }

  const { coin } = answer;
  const symbol = coin.symbol.toUpperCase();
  const signals: Signal[] = [
    {
      id: 'token_listed',
      title: `Listed on CoinGecko as ${coin.name} (${symbol})`,
      detail: `${coin.marketCapRank ? `Market value rank #${coin.marketCapRank}. ` : ''}Being listed only means the token is traded somewhere. It is not proof that an offer using it is trustworthy.`,
      weight: 0,
    },
  ];

  if (answer.matchedBy !== 'address' && answer.sameSymbolCount >= 2) {
    signals.push({
      id: 'token_shared_symbol',
      title: `${answer.sameSymbolCount} listed tokens use the symbol ${symbol}`,
      detail:
        'Scammers often make copycat tokens with a popular symbol. This result is for the largest one. Ask for the contract address and check it here.',
      weight: TOKEN_WEIGHTS.sharedSymbol,
    });
  }

  if (coin.marketCapUsd === null || coin.marketCapUsd === 0) {
    signals.push({
      id: 'token_unknown_market_cap',
      title: 'Market value unknown',
      detail: 'CoinGecko has no market value for this token, so there is little public information about it.',
      weight: TOKEN_WEIGHTS.unknownMarketCap,
    });
  } else if (coin.marketCapUsd < TINY_MARKET_CAP_USD) {
    signals.push({
      id: 'token_tiny_market_cap',
      title: 'Very small market value',
      detail: `The whole token is worth about ${formatUsd(coin.marketCapUsd)}. Small tokens are easy for a few people to push up and then sell ("pump and dump").`,
      weight: TOKEN_WEIGHTS.tinyMarketCap,
    });
  }

  if (coin.marketCapRank === null) {
    signals.push({
      id: 'token_no_rank',
      title: 'No market value rank',
      detail: 'CoinGecko does not rank this token, which usually means it is very small or new.',
      weight: TOKEN_WEIGHTS.noRank,
    });
  }

  if (coin.volume24hUsd !== null && coin.volume24hUsd < LOW_VOLUME_USD) {
    signals.push({
      id: 'token_low_volume',
      title: 'Very little trading',
      detail: `Only about ${formatUsd(coin.volume24hUsd)} was traded in the last 24 hours. It may be hard to sell if you buy it.`,
      weight: TOKEN_WEIGHTS.lowVolume,
    });
  }

  if (coin.priceChange24hPct !== null && Math.abs(coin.priceChange24hPct) >= BIG_SWING_PCT) {
    const direction = coin.priceChange24hPct > 0 ? 'up' : 'down';
    signals.push({
      id: 'token_big_swing',
      title: `Price went ${direction} ${Math.round(Math.abs(coin.priceChange24hPct))}% in 24 hours`,
      detail: 'Very large, fast price moves are common with pump-and-dump tokens. Promoters may show the rise to pressure you to buy.',
      weight: TOKEN_WEIGHTS.bigSwing,
    });
  }

  return signals;
}

/** The full result for a token check, scored like every other check. */
export function tokenResult(input: string, answer: TokenAnswer): RiskResult {
  const signals = tokenSignals(answer);
  return { type: 'token', input: input.trim(), signals, ...scoreSignals(signals) };
}

// --- Errors ---------------------------------------------------------------------

export const TOKEN_LOOKUP_NOT_SET_UP_MESSAGE =
  'Token lookup is not set up yet. Deploy the token-lookup Edge Function and set its CoinGecko key (see README).';

/** A plain-language message for a failed lookup. Raw server text is never shown. */
export function tokenErrorMessage(failure: FunctionFailure): string {
  switch (failure.kind) {
    case 'network':
      return NETWORK_ERROR_MESSAGE;
    case 'not_configured_app':
      return 'Supabase is not configured, so tokens cannot be looked up.';
    case 'other':
      return 'The token could not be looked up. Please try again.';
    case 'http':
      if (failure.status === 401) return 'Your session has expired. Please sign in again.';
      if (failure.status === 404 || failure.code === 'not_configured') return TOKEN_LOOKUP_NOT_SET_UP_MESSAGE;
      if (failure.code === 'upstream_quota') return 'CoinGecko is busy right now. Please try again in a minute.';
      if (failure.status === 400) return 'That could not be looked up. Check the name or address.';
      return 'CoinGecko is not responding. Please try again in a moment.';
  }
}
