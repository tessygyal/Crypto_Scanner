import { PLATFORMS, SCHEME_TYPES } from '@/types/database';

import { findPersonalDetails, PLATFORM_LABELS, reportSchema, roundCoordinate, SCHEME_LABELS, STATUS_COPY } from '../reports';

const valid = {
  schemeType: 'investment_ponzi',
  platform: 'facebook',
  description: 'A Facebook page promised to double any kina sent within 7 days.',
  location: { latitude: -9.44, longitude: 147.18 },
} as const;

describe('labels', () => {
  it('has a label for every scheme type and platform the database allows', () => {
    expect(Object.keys(SCHEME_LABELS).sort()).toEqual([...SCHEME_TYPES].sort());
    expect(Object.keys(PLATFORM_LABELS).sort()).toEqual([...PLATFORMS].sort());
  });

  it('never calls a status "safe"', () => {
    for (const { label, detail } of Object.values(STATUS_COPY)) expect(`${label} ${detail}`).not.toMatch(/\bsafe\b/i);
  });
});

describe('roundCoordinate', () => {
  it.each([
    [-9.443812, -9.44],
    [147.18039, 147.18],
    [147.185, 147.19],
    [0, 0],
  ])('%f → %f', (value, rounded) => {
    expect(roundCoordinate(value)).toBeCloseTo(rounded, 10);
  });
});

describe('findPersonalDetails', () => {
  it.each([
    ['Call 7123 4567 to join', 'phone', '7123 4567'],
    ['WhatsApp +675 7123 4567 now', 'phone', '+675 7123 4567'],
    ['ring 71234567', 'phone', '71234567'],
    ['landline 321-1234 office', 'phone', '321-1234'],
    ['send it to agent.png@gmail.com today', 'email', 'agent.png@gmail.com'],
  ])('finds %j', (text, kind, match) => {
    expect(findPersonalDetails(text)).toEqual([{ kind, text: match }]);
  });

  it.each([
    'They said K10000 would become K20000 in a week.',
    'I sent 1000000 kina worth of USDT.',
    'Promised $ 2500000 back.',
    'Asked for 5000000 tokens.',
    'Returns of 300% every month.',
    'Joined on 12 March after a friend shared a TikTok video.',
    'The site was binance-airdrop.xyz and asked for my seed phrase.',
  ])('allows ordinary text: %j', (text) => {
    expect(findPersonalDetails(text)).toEqual([]);
  });
});

describe('reportSchema', () => {
  const messages = (input: unknown) =>
    reportSchema.safeParse(input).error?.issues.map((i) => `${String(i.path[0])}: ${i.message}`) ?? [];

  it('accepts a valid report and trims the description', () => {
    const parsed = reportSchema.parse({ ...valid, description: `  ${valid.description}  ` });
    expect(parsed.description).toBe(valid.description);
  });

  it('allows a report without a location', () => {
    expect(reportSchema.safeParse({ ...valid, location: null }).success).toBe(true);
  });

  it('requires a scheme type and platform from the allowed lists', () => {
    expect(messages({ ...valid, schemeType: 'named_person', platform: undefined })).toEqual([
      'schemeType: Choose the type of scheme.',
      'platform: Choose where you saw it.',
    ]);
  });

  it('checks description length', () => {
    expect(messages({ ...valid, description: 'too short' })).toEqual([
      'description: Describe what happened in at least 20 characters.',
    ]);
    expect(messages({ ...valid, description: 'x'.repeat(2001) })).toEqual(['description: Use 2,000 characters or fewer.']);
  });

  it('blocks phone numbers and email addresses with one clear message', () => {
    expect(
      messages({ ...valid, description: 'Contact their agent on 7123 4567 or agent@example.com to invest.' })
    ).toEqual([
      'description: Remove email addresses and phone numbers. Describe the scheme and where you saw it, not the people involved.',
    ]);
  });

  it('rejects impossible coordinates', () => {
    expect(reportSchema.safeParse({ ...valid, location: { latitude: 120, longitude: 0 } }).success).toBe(false);
  });
});
