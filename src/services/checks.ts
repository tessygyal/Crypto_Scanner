import type { CheckRow, Json } from '@/types/database';
import { FriendlyDbError } from '@/utils/db-errors';
import type { RiskResult } from '@/utils/risk/types';

import { db, run } from './db';

/**
 * The signed-in user's check history. RLS limits every query to the user's
 * own rows, and the database fills in user_id from the session.
 * Every function throws `FriendlyDbError` on failure.
 */

const COLUMNS = 'id, user_id, input, type, score, risk_level, signals, created_at';
export const HISTORY_PAGE_SIZE = 20;

export async function saveCheck(result: RiskResult): Promise<CheckRow> {
  // Store a compact form; full explanations are recreated when a check is re-run.
  const signals: Json = result.signals.map(({ id, title, weight }) => ({ id, title, weight }));
  return run(
    db()
      .from('checks')
      .insert({
        input: result.input.slice(0, 2048),
        type: result.type,
        score: result.score,
        risk_level: result.level,
        signals,
      })
      .select(COLUMNS)
      .single()
  );
}

export type HistoryPage = { checks: CheckRow[]; nextPage: number | null };

/** One page of history, newest first. `page` starts at 0. */
export async function listChecks(page: number): Promise<HistoryPage> {
  const from = page * HISTORY_PAGE_SIZE;
  // Ask for one extra row to know whether another page exists.
  const rows = await run(
    db()
      .from('checks')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + HISTORY_PAGE_SIZE)
  );
  const hasMore = rows.length > HISTORY_PAGE_SIZE;
  return { checks: rows.slice(0, HISTORY_PAGE_SIZE), nextPage: hasMore ? page + 1 : null };
}

/** One saved check, or null if it doesn't exist (or isn't yours). */
export async function getCheck(id: string): Promise<CheckRow | null> {
  return run(db().from('checks').select(COLUMNS).eq('id', id).maybeSingle());
}

export async function deleteCheck(id: string): Promise<void> {
  const deleted = await run(db().from('checks').delete().eq('id', id).select('id'));
  if (deleted.length === 0) {
    throw new FriendlyDbError({ code: '23503', message: 'check not found' });
  }
}
