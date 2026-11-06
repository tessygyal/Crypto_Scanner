import { z } from 'zod';

import { PLATFORMS, SCHEME_TYPES, type Platform, type ReportStatus, type SchemeType } from '@/types/database';

export const SCHEME_LABELS: Record<SchemeType, string> = {
  investment_ponzi: 'Investment / Ponzi scheme',
  fake_exchange: 'Fake exchange or trading app',
  giveaway_airdrop: 'Giveaway or "airdrop"',
  romance: 'Romance scam',
  impersonation: 'Pretending to be a company, bank or official',
  phishing: 'Fake login or phishing link',
  pump_and_dump: 'Pump-and-dump token',
  job_task: 'Job or "task" scam',
  other: 'Other',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  website: 'Website',
  sms: 'SMS / text message',
  phone_call: 'Phone call',
  in_person: 'In person',
  other: 'Other',
};

export const STATUS_COPY: Record<ReportStatus, { label: string; detail: string }> = {
  pending: {
    label: 'Pending review',
    detail: 'Only you can see this report until a moderator approves it.',
  },
  approved: {
    label: 'Approved',
    detail: 'Everyone using the app can see this report on the community list and map.',
  },
  rejected: {
    label: 'Not approved',
    detail: "A moderator didn't approve this report, so only you can see it. You can edit it to send it for review again.",
  },
};

/**
 * Round a coordinate so a report never reveals someone's exact location.
 * 2 decimal places ≈ 1.1 km.
 */
export function roundCoordinate(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export type PersonalDetail = { kind: 'phone' | 'email'; text: string };

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// 7+ digits, optionally with spaces/dashes and a +675 country code.
const PHONE = /(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){6,}\d/g;
// Amounts like "K10000", "$ 2000000" or "1000000 kina" are not phone numbers.
const MONEY_BEFORE = /(?:K|PGK|\$|USD|USDT)\s?$/i;
const MONEY_AFTER = /^\s?(?:kina|k\b|pgk|usd|usdt|btc|eth|%|tokens?)/i;

/**
 * Find phone numbers and email addresses. Reports must describe schemes and
 * platforms, not identify people, so these are not allowed in descriptions.
 */
export function findPersonalDetails(text: string): PersonalDetail[] {
  const found: PersonalDetail[] = [];
  for (const m of text.matchAll(EMAIL)) found.push({ kind: 'email', text: m[0] });

  const withoutEmails = text.replace(EMAIL, (e) => ' '.repeat(e.length));
  for (const m of withoutEmails.matchAll(PHONE)) {
    const start = m.index ?? 0;
    const before = withoutEmails.slice(Math.max(0, start - 5), start);
    const after = withoutEmails.slice(start + m[0].length, start + m[0].length + 8);
    if (MONEY_BEFORE.test(before) || MONEY_AFTER.test(after)) continue;
    found.push({ kind: 'phone', text: m[0].trim() });
  }
  return found;
}

export const reportSchema = z.object({
  schemeType: z.enum(SCHEME_TYPES, { message: 'Choose the type of scheme.' }),
  platform: z.enum(PLATFORMS, { message: 'Choose where you saw it.' }),
  description: z
    .string()
    .trim()
    .min(20, 'Describe what happened in at least 20 characters.')
    .max(2000, 'Use 2,000 characters or fewer.')
    .superRefine((text, ctx) => {
      const details = findPersonalDetails(text);
      if (details.length) {
        const kinds = [...new Set(details.map((d) => (d.kind === 'email' ? 'email addresses' : 'phone numbers')))];
        ctx.addIssue({
          code: 'custom',
          message: `Remove ${kinds.join(' and ')}. Describe the scheme and where you saw it, not the people involved.`,
        });
      }
    }),
  location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).nullable(),
});

export type ReportForm = z.input<typeof reportSchema>;
export type ReportInput = z.output<typeof reportSchema>;
