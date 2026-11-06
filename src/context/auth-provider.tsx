import type { Session, User } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSession, onSessionChange } from '@/services/auth';
import { appEnv } from '@/utils/env';

type AuthState = {
  session: Session | null;
  user: User | null;
  /** True until the stored session has been read on startup. */
  isLoading: boolean;
  /** False when Supabase env vars are missing, so auth cannot work. */
  isConfigured: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

/** Tracks the signed-in session for the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(appEnv.ok);

  useEffect(() => {
    if (!appEnv.ok) return;
    let active = true;
    getSession().then((s) => {
      if (!active) return;
      setSession(s);
      setIsLoading(false);
    });
    const unsubscribe = onSessionChange((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, isLoading, isConfigured: appEnv.ok }),
    [session, isLoading]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
