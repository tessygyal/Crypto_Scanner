import type { ReportRow } from '@/types/database';
import { FriendlyDbError } from '@/utils/db-errors';
import type { ReportInput } from '@/utils/reports';

import { db, run } from './db';

/**
 * Community reports. RLS decides what each user can see: approved reports
 * from everyone, plus all of their own. New and edited reports are always
 * "pending" (enforced by the database). Every function throws FriendlyDbError.
 */

const COLUMNS =
  'id, user_id, scheme_type, platform, description, latitude, longitude, status, created_at, updated_at';
export const REPORTS_PAGE_SIZE = 20;

export type Report = ReportRow & { reporter: string | null };
export type ReportScope = 'community' | 'mine';
export type ReportPage = { reports: Report[]; nextPage: number | null };

type RowWithProfile = ReportRow & { profiles: { display_name: string } | null };

function withReporter({ profiles, ...row }: RowWithProfile): Report {
  return { ...row, reporter: profiles?.display_name ?? null };
}

/** One page of reports, newest first. "community" = approved; "mine" = the user's own, any status. */
export async function listReports(scope: ReportScope, userId: string, page: number): Promise<ReportPage> {
  const from = page * REPORTS_PAGE_SIZE;
  let query = db().from('reports').select(`${COLUMNS}, profiles(display_name)`);
  query = scope === 'community' ? query.eq('status', 'approved') : query.eq('user_id', userId);
  const rows = (await run(
    query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + REPORTS_PAGE_SIZE)
  )) as RowWithProfile[];
  return {
    reports: rows.slice(0, REPORTS_PAGE_SIZE).map(withReporter),
    nextPage: rows.length > REPORTS_PAGE_SIZE ? page + 1 : null,
  };
}

export async function getReport(id: string): Promise<Report | null> {
  const row = (await run(
    db().from('reports').select(`${COLUMNS}, profiles(display_name)`).eq('id', id).maybeSingle()
  )) as RowWithProfile | null;
  return row ? withReporter(row) : null;
}

function toColumns(input: ReportInput) {
  return {
    scheme_type: input.schemeType,
    platform: input.platform,
    description: input.description,
    latitude: input.location?.latitude ?? null,
    longitude: input.location?.longitude ?? null,
  };
}

export async function createReport(input: ReportInput): Promise<ReportRow> {
  // user_id and status ("pending") are set by the database.
  return run(db().from('reports').insert(toColumns(input)).select(COLUMNS).single());
}

/** Update your own report. The database sends it back to "pending". */
export async function updateReport(id: string, input: ReportInput): Promise<ReportRow> {
  const rows = await run(db().from('reports').update(toColumns(input)).eq('id', id).select(COLUMNS));
  if (rows.length === 0) throw new FriendlyDbError({ code: '23503', message: 'report not found' });
  return rows[0];
}

export async function deleteReport(id: string): Promise<void> {
  const rows = await run(db().from('reports').delete().eq('id', id).select('id'));
  if (rows.length === 0) throw new FriendlyDbError({ code: '23503', message: 'report not found' });
}
