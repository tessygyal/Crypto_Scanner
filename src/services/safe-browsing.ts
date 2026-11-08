import {
  parseSafeBrowsingAnswer,
  safeBrowsingErrorMessage,
  type SafeBrowsingAnswer,
  type SafeBrowsingFailure,
} from '@/utils/safe-browsing';

import { describeFunctionFailure as describeFailure } from './edge-function';
import { supabase } from './supabase';

/** An Error whose message is already safe to show to the user. */
export class SafeBrowsingError extends Error {
  constructor(failure: SafeBrowsingFailure, cause?: unknown) {
    super(safeBrowsingErrorMessage(failure));
    this.name = 'SafeBrowsingError';
    this.cause = cause;
  }
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
