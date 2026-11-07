/**
 * Pure logic for the safe-browsing Edge Function: input validation, the
 * Google Safe Browsing v4 Lookup request, and turning Google's reply into the
 * small answer the app receives. No Deno or network APIs here, so it can be
 * unit-tested with Node (see supabase/tests/safe-browsing.test.mjs).
 *
 * API docs: https://developers.google.com/safe-browsing/v4/lookup-api
 */

export const LOOKUP_ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

export const THREAT_TYPES = [
  'MALWARE',
  'SOCIAL_ENGINEERING',
  'UNWANTED_SOFTWARE',
  'POTENTIALLY_HARMFUL_APPLICATION',
] as const;

export type ThreatType = (typeof THREAT_TYPES)[number];

/** What the app receives. Never includes the API key or Google's raw reply. */
export type LookupAnswer = { status: 'listed'; threats: ThreatType[] } | { status: 'not_listed' };

const MAX_URL_LENGTH = 2048;

export type ParsedInput = { ok: true; url: string } | { ok: false; error: string };

/**
 * Read `{ "url": "..." }` from the request body. Only http(s) links are looked
 * up; a bare "example.com" is treated as "http://example.com".
 */
export function parseInput(body: unknown): ParsedInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Send JSON like {"url": "https://example.com"}.' };
  }
  const raw = (body as Record<string, unknown>).url;
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, error: 'url is required.' };

  const trimmed = raw.trim();
  if (trimmed.length > MAX_URL_LENGTH) return { ok: false, error: 'url is too long.' };

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `http://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: 'url is not a valid web link.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https links can be looked up.' };
  }
  if (!parsed.hostname) return { ok: false, error: 'url is not a valid web link.' };

  return { ok: true, url: candidate };
}

/** The JSON body for threatMatches:find. */
export function buildLookupBody(url: string, clientVersion = '1.0.0') {
  return {
    client: { clientId: 'scam-detector-png', clientVersion },
    threatInfo: {
      threatTypes: [...THREAT_TYPES],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }],
    },
  };
}

/**
 * Turn Google's reply into our answer. An empty object means "no match".
 * Returns null if the reply is not in the expected shape.
 */
export function interpretLookupResponse(json: unknown): LookupAnswer | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const matches = (json as Record<string, unknown>).matches;
  if (matches === undefined) return { status: 'not_listed' };
  if (!Array.isArray(matches)) return null;

  const known = new Set<string>(THREAT_TYPES);
  const threats = new Set<ThreatType>();
  for (const m of matches) {
    const type = m && typeof m === 'object' ? (m as Record<string, unknown>).threatType : undefined;
    if (typeof type === 'string' && known.has(type)) threats.add(type as ThreatType);
  }
  // Any match counts, even one with a threat type we don't know yet (threats may then be empty).
  return matches.length > 0 ? { status: 'listed', threats: [...threats] } : { status: 'not_listed' };
}
