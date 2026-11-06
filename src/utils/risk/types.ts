import type { CheckType, DbRiskLevel } from '@/types/database';

export type RiskLevel = DbRiskLevel; // 'none' | 'low' | 'medium' | 'high'

/** One risk indicator found during a check. */
export type Signal = {
  /** Stable id, saved in the database (e.g. "raw_ip"). */
  id: string;
  /** Short plain-language headline. */
  title: string;
  /** What we found and why it matters. */
  detail: string;
  /** Points added to the score (0 = information only). */
  weight: number;
};

export type RiskResult = {
  type: CheckType;
  /** What was checked, as shown to the user and saved in history. */
  input: string;
  /** 0–100. */
  score: number;
  level: RiskLevel;
  signals: Signal[];
};
