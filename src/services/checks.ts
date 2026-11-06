import type { CheckRow, Json } from '@/types/database';
import { FriendlyDbError } from '@/utils/db-errors';
import type { RiskResult } from '@/utils/risk/types';

import { requireSupabase } from './supabase';

const COLUMNS = 'id, user_id, input, type, score, risk_level, signals, created_at';

/**
 * Save a check result to the signed-in user's history. The database fills in
 * user_id from the session (auth.uid()), and RLS only allows the user's own rows.
 */
export async function saveCheck(result: RiskResult): Promise<CheckRow> {
  let db;
  try {
    db = requireSupabase();
  } catch (e) {
    throw new FriendlyDbError(e);
  }

  // Store a compact form; full explanations are recreated when a check is re-run.
  const signals: Json = result.signals.map(({ id, title, weight }) => ({ id, title, weight }));

  let response;
  try {
    response = await db
      .from('checks')
      .insert({
        input: result.input.slice(0, 2048),
        type: result.type,
        score: result.score,
        risk_level: result.level,
        signals,
      })
      .select(COLUMNS)
      .single();
  } catch (e) {
    throw new FriendlyDbError(e);
  }
  if (response.error) throw new FriendlyDbError(response.error);
  return response.data;
}
