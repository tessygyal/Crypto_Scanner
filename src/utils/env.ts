import { z } from 'zod';

/**
 * Public app configuration from EXPO_PUBLIC_* environment variables.
 *
 * These values are bundled into the app, so they must be public by design:
 * the Supabase project URL and the *publishable* key only. Never put the
 * secret / service-role key or the database password here.
 */

export const ENV_KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] as const;
export type EnvKey = (typeof ENV_KEYS)[number];

export type AppEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export type EnvResult =
  | { ok: true; env: AppEnv }
  | { ok: false; missing: EnvKey[]; invalid: EnvKey[] };

/** Values copied unchanged from .env.example count as missing. */
const PLACEHOLDER = /YOUR[-_]/i;

const rules: Record<EnvKey, z.ZodType<string>> = {
  EXPO_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
};

/** Validate raw environment values. Pure, so it can be unit tested. */
export function parseEnv(raw: Partial<Record<EnvKey, string | undefined>>): EnvResult {
  const missing: EnvKey[] = [];
  const invalid: EnvKey[] = [];

  for (const key of ENV_KEYS) {
    const value = raw[key]?.trim();
    if (!value || PLACEHOLDER.test(value)) missing.push(key);
    else if (!rules[key].safeParse(value).success) invalid.push(key);
  }

  if (missing.length || invalid.length) return { ok: false, missing, invalid };

  return {
    ok: true,
    env: {
      supabaseUrl: raw.EXPO_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, ''),
      supabasePublishableKey: raw.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),
    },
  };
}

// Expo only inlines EXPO_PUBLIC_* values when they are read as literal
// `process.env.NAME` expressions, so read each one explicitly.
export const appEnv: EnvResult = parseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
