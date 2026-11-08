// Supabase Edge Function (Deno): look up a crypto token on CoinGecko.
//
// - Only signed-in users can call it (`verify_jwt` on, `withSupabase({ auth: 'user' })`),
//   which also handles CORS for the web build.
// - The CoinGecko Demo API key is read from the Edge Function secret
//   COINGECKO_API_KEY. It never reaches the app.
// - The query is not stored or logged here.
//
// Deploy:  npx supabase functions deploy token-lookup
// Secret:  npx supabase secrets set COINGECKO_API_KEY=...
import { withSupabase } from 'npm:@supabase/server@^1';

import {
  coinUrl,
  contractUrl,
  KEY_HEADER,
  parseInput,
  pickSearchMatch,
  searchUrl,
  summariseCoin,
  type TokenAnswer,
} from './logic.ts';

const TIMEOUT_MS = 8000;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

class UpstreamError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** GET from CoinGecko. Returns null on 404; throws UpstreamError on other failures. */
async function get(url: string, apiKey: string): Promise<unknown | null> {
  let reply: Response;
  try {
    reply = await fetch(url, {
      headers: { accept: 'application/json', [KEY_HEADER]: apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new UpstreamError('upstream_unavailable');
  }
  if (reply.status === 404) return null;
  if (!reply.ok) {
    console.error(`token-lookup: CoinGecko replied ${reply.status}`);
    throw new UpstreamError(reply.status === 429 ? 'upstream_quota' : 'upstream_error');
  }
  return await reply.json().catch(() => {
    throw new UpstreamError('upstream_error');
  });
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req) => {
    if (req.method !== 'POST') return errorResponse(405, 'method_not_allowed', 'Use POST.');

    const apiKey = Deno.env.get('COINGECKO_API_KEY');
    if (!apiKey) return errorResponse(503, 'not_configured', 'COINGECKO_API_KEY is not set.');

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, 'bad_request', 'Body must be JSON.');
    }
    const input = parseInput(body);
    if (!input.ok) return errorResponse(400, 'bad_request', input.error);
    const query = input.query;

    try {
      let answer: TokenAnswer = { status: 'not_found', kind: query.kind };

      if (query.kind === 'address') {
        for (const platform of query.platforms) {
          const coin = summariseCoin(await get(contractUrl(platform, query.address), apiKey));
          if (coin) {
            answer = { status: 'found', kind: 'address', matchedBy: 'address', sameSymbolCount: 0, coin };
            break;
          }
        }
      } else {
        const match = pickSearchMatch(await get(searchUrl(query.text), apiKey), query.text);
        if (match) {
          const coin = summariseCoin(await get(coinUrl(match.id), apiKey));
          if (coin) {
            answer = {
              status: 'found',
              kind: 'name',
              matchedBy: match.matchedBy,
              sameSymbolCount: match.sameSymbolCount,
              coin,
            };
          }
        }
      }
      return Response.json(answer);
    } catch (e) {
      const code = e instanceof UpstreamError ? e.code : 'upstream_error';
      return errorResponse(502, code, 'CoinGecko did not respond as expected.');
    }
  }),
};
