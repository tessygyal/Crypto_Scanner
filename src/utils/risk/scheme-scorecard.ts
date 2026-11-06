import { scoreSignals } from './scoring';
import type { RiskResult } from './types';

/**
 * Yes/no questions about an offer. Each "yes" is a risk indicator.
 * Based on common warning signs of investment, pyramid and crypto scams.
 */
export type SchemeQuestion = {
  id: string;
  question: string;
  /** Shown as the indicator title when answered "yes". */
  title: string;
  detail: string;
  weight: number;
};

export const SCHEME_QUESTIONS: SchemeQuestion[] = [
  {
    id: 'guaranteed_returns',
    question: 'Does it promise guaranteed or very high returns (for example "double your money")?',
    title: 'Promises guaranteed or very high returns',
    detail: 'No real investment can guarantee profits. Promises like "double your money in a week" are the most common sign of a scam.',
    weight: 30,
  },
  {
    id: 'recruit_others',
    question: 'Are you told to recruit friends or family to earn more?',
    title: 'Pays you to recruit others',
    detail: 'When money comes from new members instead of a real business, it is a pyramid or Ponzi scheme. It collapses and most people lose.',
    weight: 25,
  },
  {
    id: 'pressure',
    question: 'Are you pressured to pay quickly, or told to keep it secret?',
    title: 'Pressure to act fast or keep quiet',
    detail: 'Scammers rush you so you have no time to check, and ask for secrecy so no one can warn you.',
    weight: 15,
  },
  {
    id: 'withdrawal_fee',
    question: 'Do you have to pay a fee or "tax" before you can withdraw your money?',
    title: 'Fee required to withdraw',
    detail: 'Asking for more money before you can take yours out is a classic trick. The money usually never comes.',
    weight: 30,
  },
  {
    id: 'secret_phrase',
    question: 'Have you been asked for your wallet recovery phrase, PIN or password?',
    title: 'Asks for your recovery phrase, PIN or password',
    detail: 'Anyone with your recovery phrase can take everything in your wallet. No real company or support person will ever ask for it.',
    weight: 50,
  },
  {
    id: 'personal_account',
    question: 'Are payments made to a personal account, an "agent" or a mobile money number?',
    title: 'Payments go to a person, not a company',
    detail: 'Real investment firms are paid through registered business accounts, not personal bank or mobile money accounts.',
    weight: 20,
  },
  {
    id: 'stranger_contact',
    question: 'Did a stranger contact you first (Facebook, WhatsApp, Telegram, TikTok…)?',
    title: 'A stranger contacted you first',
    detail: 'Many scams start with an unexpected message, friend request or group invite.',
    weight: 15,
  },
  {
    id: 'fake_endorsement',
    question: 'Does it claim to be backed by a celebrity, bank or the government?',
    title: 'Claims famous or official backing',
    detail: 'Scams often use fake endorsements from celebrities, banks or the government to look trustworthy.',
    weight: 15,
  },
  {
    id: 'unclear_business',
    question: "Is it unclear who runs it or how it actually makes money?",
    title: 'Unclear who runs it or how it makes money',
    detail: 'If you cannot find a registered company, real people behind it, or a clear source of profit, treat it as high risk.',
    weight: 15,
  },
  {
    id: 'remote_access',
    question: 'Were you asked to install an app or give someone access to your phone or computer?',
    title: 'Asked to install an app or give remote access',
    detail: 'Remote-access and fake trading apps let scammers see your screen, steal codes and empty your accounts.',
    weight: 30,
  },
];

const BY_ID = new Map(SCHEME_QUESTIONS.map((q) => [q.id, q]));

/** Score the questions answered "yes". Unknown ids are ignored. */
export function analyzeScheme(yesIds: string[]): RiskResult {
  const yes = SCHEME_QUESTIONS.filter((q) => yesIds.includes(q.id));
  const signals = yes.map((q) => ({ id: q.id, title: q.title, detail: q.detail, weight: q.weight }));
  const { score, level } = scoreSignals(signals);
  return {
    type: 'scheme',
    input: `Scheme scorecard: ${yes.length} of ${SCHEME_QUESTIONS.length} warning signs`,
    score,
    level,
    signals,
  };
}

/** Keep only valid question ids, in question order (for URLs and history). */
export function cleanSchemeAnswers(ids: string[]): string[] {
  return SCHEME_QUESTIONS.map((q) => q.id).filter((id) => ids.includes(id) && BY_ID.has(id));
}
