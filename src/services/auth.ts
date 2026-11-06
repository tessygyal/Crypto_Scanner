import type { Session } from '@supabase/supabase-js';

import { FriendlyAuthError } from '@/utils/auth-errors';

import { requireSupabase, supabase } from './supabase';

/**
 * All Supabase Auth calls. Every function throws `FriendlyAuthError`, whose
 * message is safe to show on screen.
 */

async function run<R extends { data: unknown; error: unknown }>(fn: () => Promise<R>): Promise<R['data']> {
  let result: R;
  try {
    result = await fn();
  } catch (e) {
    throw new FriendlyAuthError(e);
  }
  if (result.error) throw new FriendlyAuthError(result.error);
  return result.data;
}

export async function signIn(input: { email: string; password: string }): Promise<void> {
  const client = withConfig();
  await run(() => client.auth.signInWithPassword({ email: input.email, password: input.password }));
}

export type SignUpResult = {
  /** True when Supabase requires the user to confirm their email before signing in. */
  needsEmailConfirmation: boolean;
};

export async function signUp(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<SignUpResult> {
  const client = withConfig();
  const data = await run(() =>
    client.auth.signUp({
      email: input.email,
      password: input.password,
      // Stored in auth user metadata; copied into the Profile table in M2.
      options: { data: { display_name: input.displayName } },
    })
  );
  return { needsEmailConfirmation: !data.session };
}

/** Email a one-time code the user can enter in the app to set a new password. */
export async function requestPasswordReset(email: string): Promise<void> {
  const client = withConfig();
  await run(() => client.auth.resetPasswordForEmail(email));
}

/**
 * Verify the emailed recovery code (which signs the user in), then set the
 * new password.
 */
export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  password: string;
}): Promise<void> {
  const client = withConfig();
  await run(() => client.auth.verifyOtp({ email: input.email, token: input.code, type: 'recovery' }));
  await run(() => client.auth.updateUser({ password: input.password }));
}

export async function signOut(): Promise<void> {
  const client = withConfig();
  const { error } = await client.auth.signOut();
  if (error) throw new FriendlyAuthError(error);
}

/** The stored session, or null when signed out or not configured. */
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

/** Listen for sign-in / sign-out / token refresh. Returns an unsubscribe function. */
export function onSessionChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

function withConfig() {
  try {
    return requireSupabase();
  } catch (e) {
    throw new FriendlyAuthError(e);
  }
}
