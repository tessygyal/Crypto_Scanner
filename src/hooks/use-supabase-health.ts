import { useQuery } from '@tanstack/react-query';

import { checkSupabaseHealth } from '@/services/health';
import { appEnv } from '@/utils/env';

export const supabaseHealthKey = ['supabase-health'] as const;

/**
 * Supabase connection status. Disabled (never fetches) when the app has no
 * config, so the screen can show the "not configured" empty state instead.
 */
export function useSupabaseHealth() {
  const query = useQuery({
    queryKey: supabaseHealthKey,
    queryFn: checkSupabaseHealth,
    enabled: appEnv.ok,
    retry: 1,
  });
  return { ...query, isConfigured: appEnv.ok };
}
