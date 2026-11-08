import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

import type { FunctionFailure } from '@/utils/function-errors';

/** Reduce a supabase.functions.invoke() error to what we need to pick a message. */
export async function describeFunctionFailure(error: unknown): Promise<FunctionFailure> {
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
