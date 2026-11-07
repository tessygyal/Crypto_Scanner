import { useMutation, type QueryClient } from '@tanstack/react-query';

import { saveCheck } from '@/services/checks';
import type { RiskResult } from '@/utils/risk/types';

export const saveCheckMutationKey = ['save-check'] as const;

/**
 * Registered on the QueryClient (not in the hook) so a save made offline can
 * resume after the app restarts, when no screen is mounted.
 * networkMode 'online': offline, the save waits (isPaused) instead of failing,
 * and is kept in the saved cache until it can be sent.
 */
export function registerSaveCheckDefaults(client: QueryClient) {
  client.setMutationDefaults(saveCheckMutationKey, {
    mutationFn: (result: RiskResult) => saveCheck(result),
    networkMode: 'online',
    onSuccess: () => client.invalidateQueries({ queryKey: ['checks'] }),
  });
}

/** Save a check to history. Offline, `isPaused` is true until the connection returns. */
export function useSaveCheck() {
  return useMutation<Awaited<ReturnType<typeof saveCheck>>, Error, RiskResult>({ mutationKey: saveCheckMutationKey });
}
