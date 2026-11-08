import { onlineManager, useQuery } from '@tanstack/react-query';

import { lookupToken } from '@/services/token-lookup';

/**
 * CoinGecko facts for a token. Pass null to skip. Not saved on the phone
 * (market data changes quickly); answers are reused for 5 minutes.
 */
export function useTokenLookup(query: string | null) {
  return useQuery({
    queryKey: ['token-lookup', query],
    queryFn: () => lookupToken(query as string),
    enabled: query !== null,
    staleTime: 5 * 60 * 1000,
    // Offline, fail straight away with "Could not connect" and a retry button.
    networkMode: 'always',
    retry: (failureCount) => failureCount < 1 && onlineManager.isOnline(),
  });
}
