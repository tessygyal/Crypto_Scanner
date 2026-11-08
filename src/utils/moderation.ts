import { z } from 'zod';

import type { ReportStatus } from '@/types/database';

/** Same limit as the database (reports.review_note). */
export const REVIEW_NOTE_MAX = 300;

export const reviewNoteSchema = z.object({
  note: z.string().trim().max(REVIEW_NOTE_MAX, `Use ${REVIEW_NOTE_MAX} characters or fewer.`),
});
export type ReviewNoteForm = z.input<typeof reviewNoteSchema>;

/** What a moderator sees about a report's current status. */
export const MODERATION_STATUS_COPY: Record<ReportStatus, string> = {
  pending: 'Waiting for review. Only the reporter and moderators can see it.',
  approved: 'Approved: everyone can see it on the community list and map.',
  rejected: 'Not approved: only the reporter and moderators can see it.',
};

/** Shown to the reporter with the moderator's note. */
export function reviewNoteHeading(status: ReportStatus): string {
  return status === 'rejected' ? 'Why it wasn’t approved' : 'Note from the moderator';
}
