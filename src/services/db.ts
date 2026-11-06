import { FriendlyDbError } from '@/utils/db-errors';

import { requireSupabase, type TypedSupabaseClient } from './supabase';

/** The Supabase client, or a FriendlyDbError if the app isn't configured. */
export function db(): TypedSupabaseClient {
  try {
    return requireSupabase();
  } catch (e) {
    throw new FriendlyDbError(e);
  }
}

/** The data type of a successful Supabase response (the branch where error is null). */
type SuccessData<R> = R extends { error: null; data: infer D } ? D : never;

/**
 * Run a Supabase query and return its data. Network failures and database
 * errors both become a FriendlyDbError, whose message is safe to show.
 */
export async function run<R extends { data: unknown; error: unknown }>(
  query: PromiseLike<R>
): Promise<SuccessData<R>> {
  let response: R;
  try {
    response = await query;
  } catch (e) {
    throw new FriendlyDbError(e);
  }
  if (response.error) throw new FriendlyDbError(response.error);
  return response.data as SuccessData<R>;
}
