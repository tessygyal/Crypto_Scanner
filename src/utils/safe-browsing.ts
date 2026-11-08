import { NETWORK_ERROR_MESSAGE } from '@/utils/auth-errors';
import type { FunctionFailure } from '@/utils/function-errors';
import { scoreSignals } from '@/utils/risk/scoring';
import type { RiskResult, Signal } from '@/utils/risk/types';

/** The answer from the safe-browsing Edge Function (see supabase/functions/safe-browsing). */
export type SafeBrowsingAnswer = { status: 'listed'; threats: string[] } | { status: 'not_listed' };

/** What happened when we asked Google Safe Browsing. */
export type SafeBrowsingOutcome = SafeBrowsingAnswer | { status: 'unavailable' };

/** Weight of a Google listing: on its own it is enough for "High risk indicators". */
export const LISTED_WEIGHT = 60;

const THREAT_WORDING: Record<string, string> = {
  SOCIAL_ENGINEERING: 'phishing or deception (pages that trick people into giving passwords, money or details)',
  MALWARE: 'harmful software (malware)',
  UNWANTED_SOFTWARE: 'unwanted software',
  POTENTIALLY_HARMFUL_APPLICATION: 'potentially harmful apps',
};

export function safeBrowsingSignal(outcome: SafeBrowsingOutcome): Signal {
  switch (outcome.status) {
    case 'listed': {
      const kinds = outcome.threats.map((t) => THREAT_WORDING[t]).filter(Boolean);
      const what = kinds.length ? kinds.join('; ') : 'a security threat';
      return {
        id: 'safe_browsing_listed',
        title: 'Listed by Google Safe Browsing',
        detail: `Google Safe Browsing has this link on its list of known threats: ${what}. Browsers like Chrome show a red warning page for it.`,
        weight: LISTED_WEIGHT,
      };
    }
    case 'not_listed':
      return {
        id: 'safe_browsing_not_listed',
        title: 'Not on Google Safe Browsing lists',
        detail:
          'Google Safe Browsing has no known warnings for this link. New scam sites are often not listed yet, so this is not proof it is trustworthy.',
        weight: 0,
      };
    case 'unavailable':
      return {
        id: 'safe_browsing_unavailable',
        title: 'Google Safe Browsing not checked',
        detail: "We couldn't reach Google Safe Browsing, so only the checks on your phone were used.",
        weight: 0,
      };
  }
}

/**
 * The link to send to Google, or null when the check shouldn't call Google:
 * not a link check, or a "javascript:" / "data:" style link that is already high risk.
 */
export function safeBrowsingTarget(result: RiskResult): string | null {
  if (result.type !== 'url' && result.type !== 'qr') return null;
  if (result.signals.some((s) => s.id === 'dangerous_scheme')) return null;
  return result.input;
}

/** Add Google's answer to an offline result and re-score it. */
export function withSafeBrowsing(result: RiskResult, outcome: SafeBrowsingOutcome): RiskResult {
  const signals = [...result.signals.filter((s) => !s.id.startsWith('safe_browsing_')), safeBrowsingSignal(outcome)];
  return { ...result, signals, ...scoreSignals(signals) };
}

// --- Errors ---------------------------------------------------------------------

export const SAFE_BROWSING_NOT_SET_UP_MESSAGE =
  'Google Safe Browsing is not set up yet. Deploy the safe-browsing Edge Function and set its API key (see README).';

/** A failed call, reduced to what we need to pick a message. */
export type SafeBrowsingFailure = FunctionFailure;

/** A plain-language message for a failed lookup. Raw server text is never shown. */
export function safeBrowsingErrorMessage(failure: SafeBrowsingFailure): string {
  switch (failure.kind) {
    case 'network':
      return NETWORK_ERROR_MESSAGE;
    case 'not_configured_app':
      return 'Supabase is not configured, so Google Safe Browsing cannot be used.';
    case 'other':
      return 'Google Safe Browsing could not be checked. Please try again.';
    case 'http':
      if (failure.status === 401) return 'Your session has expired. Please sign in again.';
      if (failure.status === 404 || failure.code === 'not_configured') return SAFE_BROWSING_NOT_SET_UP_MESSAGE;
      if (failure.code === 'upstream_quota') return 'Google Safe Browsing is busy right now. Please try again later.';
      if (failure.status === 400) return 'That link could not be sent to Google Safe Browsing.';
      return 'Google Safe Browsing is not responding. Please try again in a moment.';
  }
}

/** Check the function's reply really is a SafeBrowsingAnswer. */
export function parseSafeBrowsingAnswer(data: unknown): SafeBrowsingAnswer | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.status === 'not_listed') return { status: 'not_listed' };
  if (d.status === 'listed' && Array.isArray(d.threats)) {
    return { status: 'listed', threats: d.threats.filter((t): t is string => typeof t === 'string') };
  }
  return null;
}
