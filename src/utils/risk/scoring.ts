import type { RiskLevel, Signal } from './types';

/** Score thresholds. A score of 0 means no risk indicators were found. */
export const LEVEL_THRESHOLDS = { low: 1, medium: 25, high: 50 } as const;

export function scoreSignals(signals: Signal[]): { score: number; level: RiskLevel } {
  const score = Math.min(100, signals.reduce((sum, s) => sum + Math.max(0, s.weight), 0));
  return { score, level: levelForScore(score) };
}

export function levelForScore(score: number): RiskLevel {
  if (score >= LEVEL_THRESHOLDS.high) return 'high';
  if (score >= LEVEL_THRESHOLDS.medium) return 'medium';
  if (score >= LEVEL_THRESHOLDS.low) return 'low';
  return 'none';
}

/**
 * User-facing wording for each level. Never say "safe", "legit" or that
 * something "is a scam" — the app reports indicators, not verdicts.
 */
export const LEVEL_COPY: Record<RiskLevel, { label: string; summary: string; advice: string[] }> = {
  high: {
    label: 'High risk indicators',
    summary: 'We found several strong signs that are common in crypto scams.',
    advice: [
      'Do not send money, crypto or mobile money.',
      'Never share your recovery phrase, PIN or password with anyone.',
      'Report it so others in your community are warned.',
    ],
  },
  medium: {
    label: 'Some risk indicators',
    summary: 'We found signs that are often seen in scams. Be very careful.',
    advice: [
      'Do not pay or share personal details until you have checked it yourself.',
      'Look up the organisation using its official website or phone number, not links you were sent.',
      'Ask someone you trust for a second opinion.',
    ],
  },
  low: {
    label: 'Few risk indicators',
    summary: 'We found minor warning signs. They are not proof of a scam, but stay alert.',
    advice: [
      'Check the address carefully before you sign in or pay.',
      'Be wary of anything that promises easy or guaranteed money.',
    ],
  },
  none: {
    label: 'No known warnings found',
    summary:
      'Our checks did not find any known warning signs. That does not prove it is trustworthy — new scams appear every day.',
    advice: [
      'Only use links you typed yourself or got from an official source.',
      'Never share your recovery phrase, PIN or password with anyone.',
    ],
  },
};
