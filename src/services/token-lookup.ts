import { parseTokenAnswer, tokenErrorMessage, type TokenAnswer } from '@/utils/token';
import type { FunctionFailure } from '@/utils/function-errors';

import { describeFunctionFailure } from './edge-function';
import { supabase } from './supabase';

/** An Error whose message is already safe to show to the user. */
export class TokenLookupError extends Error {
  constructor(failure: FunctionFailure, cause?: unknown) {
    super(tokenErrorMessage(failure));
    this.name = 'TokenLookupError';
    this.cause = cause;
  }
}

/**
 * Look up a token name, symbol or contract address on CoinGecko via our
 * `token-lookup` Edge Function. The CoinGecko key stays on the server.
 */
export async function lookupToken(query: string): Promise<TokenAnswer> {
  if (!supabase) throw new TokenLookupError({ kind: 'not_configured_app' });

  let result: Awaited<ReturnType<typeof supabase.functions.invoke>>;
  try {
    result = await supabase.functions.invoke('token-lookup', { body: { query: query.trim() } });
  } catch (e) {
    throw new TokenLookupError({ kind: 'network' }, e);
  }
  if (result.error) throw new TokenLookupError(await describeFunctionFailure(result.error), result.error);

  const answer = parseTokenAnswer(result.data);
  if (!answer) throw new TokenLookupError({ kind: 'other' });
  return answer;
}
