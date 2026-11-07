// Supabase Edge Function (Deno): look up one link in Google Safe Browsing.
//
// - Only signed-in users can call it: `verify_jwt` stays on (the default) and
//   `withSupabase({ auth: 'user' })` checks the user's token. It also handles
//   CORS and the OPTIONS preflight, so the web build works too.
// - The Google API key is read from the Edge Function secret
//   GOOGLE_SAFE_BROWSING_API_KEY. It never reaches the app.
// - The link is not stored or logged here.
//
// Deploy:  npx supabase functions deploy safe-browsing
// Secret:  npx supabase secrets set GOOGLE_SAFE_BROWSING_API_KEY=...
import { withSupabase } from 'npm:@supabase/server@^1';

import { buildLookupBody, interpretLookupResponse, LOOKUP_ENDPOINT, parseInput } from './logic.ts';

const TIMEOUT_MS = 8000;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req) => {
    if (req.method !== 'POST') return errorResponse(405, 'method_not_allowed', 'Use POST.');

    const apiKey = Deno.env.get('GOOGLE_SAFE_BROWSING_API_KEY');
    if (!apiKey) {
      return errorResponse(503, 'not_configured', 'GOOGLE_SAFE_BROWSING_API_KEY is not set.');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, 'bad_request', 'Body must be JSON.');
    }
    const input = parseInput(body);
    if (!input.ok) return errorResponse(400, 'bad_request', input.error);

    let reply: Response;
    try {
      reply = await fetch(`${LOOKUP_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildLookupBody(input.url)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      console.error('safe-browsing: request to Google failed or timed out');
      return errorResponse(502, 'upstream_unavailable', 'Google Safe Browsing did not respond.');
    }

    if (!reply.ok) {
      // 400 usually means a bad/restricted key; 429 means the daily quota is used up.
      console.error(`safe-browsing: Google replied ${reply.status}`);
      const code = reply.status === 429 ? 'upstream_quota' : 'upstream_error';
      return errorResponse(502, code, 'Google Safe Browsing returned an error.');
    }

    const answer = interpretLookupResponse(await reply.json().catch(() => null));
    if (!answer) return errorResponse(502, 'upstream_error', 'Unexpected reply from Google Safe Browsing.');

    return Response.json(answer);
  }),
};
