import { parseEnv } from '../env';

const URL = 'https://abcdefghijklmnop.supabase.co';
const KEY = 'sb_publishable_abc123def456ghi789jkl';

describe('parseEnv', () => {
  it('accepts a valid URL and publishable key', () => {
    expect(
      parseEnv({ EXPO_PUBLIC_SUPABASE_URL: URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY })
    ).toEqual({ ok: true, env: { supabaseUrl: URL, supabasePublishableKey: KEY } });
  });

  it('trims whitespace and trailing slashes', () => {
    const result = parseEnv({
      EXPO_PUBLIC_SUPABASE_URL: `  ${URL}/ `,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ` ${KEY}\n`,
    });
    expect(result).toEqual({ ok: true, env: { supabaseUrl: URL, supabasePublishableKey: KEY } });
  });

  it('accepts a local http Supabase URL for development', () => {
    const result = parseEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY,
    });
    expect(result.ok).toBe(true);
  });

  it('reports missing values', () => {
    expect(parseEnv({})).toEqual({
      ok: false,
      missing: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
      invalid: [],
    });
    expect(parseEnv({ EXPO_PUBLIC_SUPABASE_URL: '   ', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY })).toEqual({
      ok: false,
      missing: ['EXPO_PUBLIC_SUPABASE_URL'],
      invalid: [],
    });
  });

  it('treats unedited .env.example placeholders as missing', () => {
    expect(
      parseEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
      })
    ).toEqual({
      ok: false,
      missing: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
      invalid: [],
    });
  });

  it('reports invalid values', () => {
    expect(
      parseEnv({ EXPO_PUBLIC_SUPABASE_URL: 'not a url', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'short' })
    ).toEqual({
      ok: false,
      missing: [],
      invalid: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
    });
    expect(
      parseEnv({ EXPO_PUBLIC_SUPABASE_URL: 'ftp://example.com', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY })
    ).toMatchObject({ ok: false, invalid: ['EXPO_PUBLIC_SUPABASE_URL'] });
  });
});
