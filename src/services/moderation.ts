import { db, run } from './db';

/**
 * In-app moderation. Who is a moderator is decided in the database
 * (public.moderators); the app only asks. Status changes go through the
 * moderate_report() database function, which checks the caller is a moderator.
 */

export type ModerationDecision = 'approved' | 'rejected';

/** Whether the signed-in user is a moderator. */
export async function isModerator(): Promise<boolean> {
  return (await run(db().rpc('is_moderator'))) === true;
}

/** Approve or reject someone else's report, with an optional note for the reporter. */
export async function moderateReport(reportId: string, decision: ModerationDecision, note: string): Promise<void> {
  const trimmed = note.trim();
  await run(db().rpc('moderate_report', { report_id: reportId, decision, note: trimmed === '' ? null : trimmed }));
}
