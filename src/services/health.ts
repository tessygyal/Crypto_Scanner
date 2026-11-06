import { appEnv } from '@/utils/env';

import { SupabaseNotConfiguredError } from './supabase';

export type SupabaseHealth = {
  /** Supabase Auth service name and version, as reported by the server. */
  service: string;
  version: string;
};

const TIMEOUT_MS = 10_000;

/**
 * Check that the configured Supabase project is reachable and the key is
 * accepted, by calling the Auth health endpoint.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  if (!appEnv.ok) throw new SupabaseNotConfiguredError();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${appEnv.env.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: appEnv.env.supabasePublishableKey },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error('Supabase rejected the publishable key. Check EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
    }
    if (!res.ok) throw new Error(`Supabase responded with HTTP ${res.status}.`);
    const body = (await res.json()) as { name?: string; version?: string };
    return { service: body.name ?? 'GoTrue', version: body.version ?? 'unknown' };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Supabase did not respond within 10 seconds. Check your internet connection.');
    }
    if (e instanceof TypeError) {
      throw new Error('Could not reach Supabase. Check your internet connection and the project URL.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
