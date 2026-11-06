// Gives supabase-js a persistent `localStorage` on Android/iOS (no-op on web,
// where the browser's own localStorage is used). See Expo's "Using Supabase" guide.
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';
import { appEnv } from '@/utils/env';

/** Thrown when a service needs Supabase but the app has no valid config. */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Copy .env.example to .env, fill in your project URL and ' +
        'publishable key, then restart the dev server.'
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * The Supabase client, or null until the app is configured. The app still
 * starts without config (so you can run it before creating a project);
 * services call `requireSupabase()` and surface the error state.
 */
export const supabase: TypedSupabaseClient | null = appEnv.ok
  ? createClient<Database>(appEnv.env.supabaseUrl, appEnv.env.supabasePublishableKey, {
      auth: {
        storage: typeof localStorage === 'undefined' ? undefined : localStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Native apps have no URL to read a session from.
        detectSessionInUrl: false,
      },
    })
  : null;

export function requireSupabase(): TypedSupabaseClient {
  if (!supabase) throw new SupabaseNotConfiguredError();
  return supabase;
}

// Refresh the session only while the app is in the foreground, as Supabase
// recommends for React Native. Browsers handle this themselves.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
