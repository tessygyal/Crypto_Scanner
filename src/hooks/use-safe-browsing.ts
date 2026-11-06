import { useQuery } from '@tanstack/react-query';

import { lookupSafeBrowsing } from '@/services/safe-browsing';

/**
 * Google Safe Browsing answer for a link. Pass null to skip the lookup (e.g. a
 * scorecard check). Answers are reused for 5 minutes, matching how long Google
 * says its results may be cached.
 */
export function useSafeBrowsing(url: string | null) {
  return useQuery({
    queryKey: ['safe-browsing', url],
    queryFn: () => lookupSafeBrowsing(url as string),
    enabled: url !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
