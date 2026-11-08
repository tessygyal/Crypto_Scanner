/**
 * Pure logic for the token-lookup Edge Function: input validation, CoinGecko
 * request URLs, and turning CoinGecko's replies into the small answer the app
 * receives. No Deno or network APIs here, so it can be unit-tested with Node
 * (see supabase/tests/token-lookup.test.mjs). Keep to plain TypeScript (no
 * enums) so Node's type stripping can run it.
 *
 * API docs: https://docs.coingecko.com/demo/reference/search-data
 *           https://docs.coingecko.com/demo/reference/coins-id
 *           https://docs.coingecko.com/demo/reference/coins-contract-address
 */

export const API_BASE = 'https://api.coingecko.com/api/v3';
/** Header for a CoinGecko Demo API key. */
export const KEY_HEADER = 'x-cg-demo-api-key';

/** EVM networks tried, in order, for a "0x…" address (most used in PNG first). */
export const EVM_PLATFORMS = ['ethereum', 'binance-smart-chain', 'polygon-pos', 'base'] as const;

export type TokenQuery =
  | { kind: 'address'; address: string; platforms: string[] }
  | { kind: 'name'; text: string };

export type ParsedInput = { ok: true; query: TokenQuery } | { ok: false; error: string };

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const NAME = /^[\p{L}\p{N} .\-_$]{1,50}$/u;

/** Read `{ "query": "..." }`: a token name, symbol or contract address. */
export function parseInput(body: unknown): ParsedInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Send JSON like {"query": "USDT"}.' };
  }
  const raw = (body as Record<string, unknown>).query;
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, error: 'query is required.' };
  const text = raw.trim();

  if (EVM_ADDRESS.test(text)) return { ok: true, query: { kind: 'address', address: text.toLowerCase(), platforms: [...EVM_PLATFORMS] } };
  if (TRON_ADDRESS.test(text)) return { ok: true, query: { kind: 'address', address: text, platforms: ['tron'] } };
  if (text.length >= 32 && SOLANA_ADDRESS.test(text)) {
    return { ok: true, query: { kind: 'address', address: text, platforms: ['solana'] } };
  }
  if (/^0x[0-9a-f]*$/i.test(text)) return { ok: false, error: 'query looks like an incomplete 0x address.' };
  if (!NAME.test(text)) return { ok: false, error: 'query must be a token name, symbol or contract address.' };
  return { ok: true, query: { kind: 'name', text } };
}

export function searchUrl(text: string): string {
  return `${API_BASE}/search?query=${encodeURIComponent(text)}`;
}

/** Coin details without the large parts we don't use. */
export function coinUrl(id: string): string {
  const params = 'localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false';
  return `${API_BASE}/coins/${encodeURIComponent(id)}?${params}`;
}

export function contractUrl(platform: string, address: string): string {
  return `${API_BASE}/coins/${encodeURIComponent(platform)}/contract/${encodeURIComponent(address)}`;
}

export type SearchMatch = {
  id: string;
  matchedBy: 'symbol' | 'name';
  /** How many listed coins use the same symbol (copycat tokens are common). */
  sameSymbolCount: number;
};

/**
 * Pick the coin the user meant from /search results. Only an exact symbol or
 * name match counts (CoinGecko also returns partial matches). Results are in
 * market-cap order, so the first exact match is the largest one.
 */
export function pickSearchMatch(json: unknown, text: string): SearchMatch | null {
  const coins = json && typeof json === 'object' ? (json as Record<string, unknown>).coins : undefined;
  if (!Array.isArray(coins)) return null;
  const wanted = text.trim().toLowerCase();

  type Coin = { id: string; name: string; symbol: string };
  const valid: Coin[] = coins.filter(
    (c): c is Coin =>
      !!c && typeof c === 'object' && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.symbol === 'string'
  );
  const sameSymbol = valid.filter((c) => c.symbol.toLowerCase() === wanted);
  const bySymbol = sameSymbol[0];
  const byName = valid.find((c) => c.name.toLowerCase() === wanted);
  const match = bySymbol ?? byName;
  if (!match) return null;
  return { id: match.id, matchedBy: bySymbol ? 'symbol' : 'name', sameSymbolCount: sameSymbol.length };
}

/** The facts the app uses to score a token. Missing values are null. */
export type CoinSummary = {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  priceChange24hPct: number | null;
  /** Networks the token is on (CoinGecko platform ids). */
  platforms: string[];
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const usd = (v: unknown): number | null =>
  v && typeof v === 'object' ? num((v as Record<string, unknown>).usd) : null;

/** Reduce a /coins/{id} or /coins/{platform}/contract/{address} reply. Null if it isn't a coin. */
export function summariseCoin(json: unknown): CoinSummary | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const c = json as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.name !== 'string' || typeof c.symbol !== 'string') return null;
  const market = c.market_data && typeof c.market_data === 'object' ? (c.market_data as Record<string, unknown>) : {};
  const platforms =
    c.platforms && typeof c.platforms === 'object' && !Array.isArray(c.platforms)
      ? Object.keys(c.platforms as Record<string, unknown>).filter((p) => p !== '')
      : [];
  return {
    id: c.id,
    name: c.name.slice(0, 100),
    symbol: c.symbol.slice(0, 20),
    marketCapRank: num(c.market_cap_rank),
    marketCapUsd: usd(market.market_cap),
    volume24hUsd: usd(market.total_volume),
    priceChange24hPct: num(market.price_change_percentage_24h),
    platforms,
  };
}

/** What the app receives. Never includes the API key or CoinGecko's raw reply. */
export type TokenAnswer =
  | { status: 'not_found'; kind: TokenQuery['kind'] }
  | {
      status: 'found';
      kind: TokenQuery['kind'];
      matchedBy: 'address' | 'symbol' | 'name';
      sameSymbolCount: number;
      coin: CoinSummary;
    };
