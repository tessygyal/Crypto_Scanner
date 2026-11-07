import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

import {
  parseSafeBrowsingAnswer,
  safeBrowsingErrorMessage,
  type SafeBrowsingAnswer,
  type SafeBrowsingFailure,
} from '@/utils/safe-browsing';

import { supabase } from './supabase';

/** An Error whose message is already safe to show to the user. */
export class SafeBrowsingError extends Error {
  constructor(failure: SafeBrowsingFailure, cause?: unknown) {
    super(safeBrowsingErrorMessage(failure));
    this.name = 'SafeBrowsingError';
    this.cause = cause;
  }
}

async function describeFailure(error: unknown): Promise<SafeBrowsingFailure> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    let code: string | undefined;
    try {
      const body = await response?.json();
      if (typeof body?.error?.code === 'string') code = body.error.code;
    } catch {
      // Not JSON (e.g. the gateway's own error page) — the status is enough.
    }
    return { kind: 'http', status: response?.status ?? 500, code };
  }
  if (error instanceof FunctionsFetchError) return { kind: 'network' };
  if (error instanceof FunctionsRelayError) return { kind: 'http', status: 502 };
  return { kind: 'other' };
}

/**
 * Look up a link in Google Safe Browsing via our `safe-browsing` Edge Function.
 * The Google API key stays on the server. Throws SafeBrowsingError on failure.
 */
export async function lookupSafeBrowsing(url: string): Promise<SafeBrowsingAnswer> {
  if (!supabase) throw new SafeBrowsingError({ kind: 'not_configured_app' });

  let result: Awaited<ReturnType<typeof supabase.functions.invoke>>;
  try {
    result = await supabase.functions.invoke('safe-browsing', { body: { url } });
  } catch (e) {
    throw new SafeBrowsingError({ kind: 'network' }, e);
  }
  if (result.error) throw new SafeBrowsingError(await describeFailure(result.error), result.error);

  const answer = parseSafeBrowsingAnswer(result.data);
  if (!answer) throw new SafeBrowsingError({ kind: 'other' });
  return answer;
}
