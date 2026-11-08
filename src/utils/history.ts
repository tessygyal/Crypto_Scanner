import type { CheckRow, Json } from '@/types/database';
import { cleanSchemeAnswers } from '@/utils/risk/scheme-scorecard';

/** A risk indicator as saved in the checks table (compact form). */
export type StoredSignal = { id: string; title: string; weight: number };

/** Read the saved signals JSON defensively; skip anything malformed. */
export function parseStoredSignals(json: Json): StoredSignal[] {
  if (!Array.isArray(json)) return [];
  const out: StoredSignal[] = [];
  for (const item of json) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const { id, title, weight } = item as Record<string, Json | undefined>;
    if (typeof id !== 'string' || typeof title !== 'string') continue;
    out.push({ id, title, weight: typeof weight === 'number' && Number.isFinite(weight) ? weight : 0 });
  }
  return out;
}

/** Route and params to re-run a saved check with the current rules. */
export function rerunParams(check: Pick<CheckRow, 'type' | 'input' | 'signals'>):
  | { type: 'url'; input: string }
  | { type: 'token'; input: string }
  | { type: 'scheme'; answers: string }
  | null {
  if (check.type === 'url' || check.type === 'qr') return { type: 'url', input: check.input };
  if (check.type === 'scheme') {
    // The scorecard's "yes" answers are the saved signal ids.
    const answers = cleanSchemeAnswers(parseStoredSignals(check.signals).map((s) => s.id));
    return { type: 'scheme', answers: answers.join(',') };
  }
  if (check.type === 'token') return { type: 'token', input: check.input };
  return null;
}

export const CHECK_TYPE_LABEL: Record<CheckRow['type'], string> = {
  url: 'Link',
  qr: 'QR code',
  token: 'Token',
  scheme: 'Offer',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Short, friendly time: "Just now", "5 min ago", "3 h ago", "Yesterday",
 * "4 Nov" (this year) or "4 Nov 2025". Uses the phone's local time.
 */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 3600 * 1000;
  if (date.getTime() >= startOfToday) return `${Math.floor(seconds / 3600)} h ago`;
  if (date.getTime() >= startOfYesterday) return 'Yesterday';

  const dayMonth = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? dayMonth : `${dayMonth} ${date.getFullYear()}`;
}

/** Full date and time for the detail screen, e.g. "6 Nov 2026, 2:05 pm". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hour12}:${minutes} ${h < 12 ? 'am' : 'pm'}`;
}
