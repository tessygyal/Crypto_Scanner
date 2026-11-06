import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveCheck } from '@/services/checks';

/** Save a check to history. Invalidates the history list (built in a later milestone). */
export function useSaveCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveCheck,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checks'] }),
  });
}
