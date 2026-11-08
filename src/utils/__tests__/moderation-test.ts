import { REPORT_STATUSES } from '@/types/database';

import { MODERATION_STATUS_COPY, REVIEW_NOTE_MAX, reviewNoteHeading, reviewNoteSchema } from '../moderation';

describe('reviewNoteSchema', () => {
  it('allows an empty note and trims it', () => {
    expect(reviewNoteSchema.parse({ note: '' })).toEqual({ note: '' });
    expect(reviewNoteSchema.parse({ note: '  Remove the name.  ' })).toEqual({ note: 'Remove the name.' });
  });

  it('matches the database limit of 300 characters', () => {
    expect(REVIEW_NOTE_MAX).toBe(300);
    expect(reviewNoteSchema.safeParse({ note: 'x'.repeat(300) }).success).toBe(true);
    expect(reviewNoteSchema.safeParse({ note: 'x'.repeat(301) }).success).toBe(false);
  });
});

describe('moderation wording', () => {
  it('covers every status and never gives a verdict', () => {
    const texts = [...REPORT_STATUSES.map((s) => MODERATION_STATUS_COPY[s]), ...REPORT_STATUSES.map(reviewNoteHeading)];
    for (const text of texts) {
      expect(text).toBeTruthy();
      expect(text).not.toMatch(/\bsafe\b|\blegit|\bis a scam\b|\bnot a scam\b/i);
    }
  });

  it('explains a rejection differently from other notes', () => {
    expect(reviewNoteHeading('rejected')).toMatch(/approved/);
    expect(reviewNoteHeading('approved')).toBe('Note from the moderator');
  });
});
