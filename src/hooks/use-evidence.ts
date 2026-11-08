import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/auth-provider';
import {
  deleteEvidence,
  listEvidence,
  pickEvidenceImage,
  uploadEvidence,
  type Evidence,
} from '@/services/evidence';

/**
 * Not saved to the phone (the query root is not in PERSISTED_ROOTS): the image
 * links expire after an hour, so a cached copy would only show broken images.
 */
export const evidenceKeys = {
  list: (reportId: string) => ['evidence', reportId] as const,
};

/** Screenshots on a report. Pass enabled=false for reports you can't see evidence for. */
export function useEvidence(reportId: string, enabled: boolean) {
  return useQuery({
    queryKey: evidenceKeys.list(reportId),
    queryFn: () => listEvidence(reportId),
    enabled: enabled && !!reportId,
    // Refresh the signed links well before they expire.
    staleTime: 30 * 60 * 1000,
  });
}

/** Pick a screenshot and upload it. Resolves to false if the user cancelled. */
export function useAddEvidence(reportId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (existingCount: number) => {
      const picked = await pickEvidenceImage();
      if (picked.status === 'cancelled') return false;
      await uploadEvidence({ userId: user!.id, reportId, base64: picked.base64, existingCount });
      return true;
    },
    onSuccess: (added) => {
      if (added) queryClient.invalidateQueries({ queryKey: evidenceKeys.list(reportId) });
    },
  });
}

export function useDeleteEvidence(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: Evidence) => deleteEvidence(item),
    onSuccess: (_void, item) => {
      queryClient.setQueryData<Evidence[]>(evidenceKeys.list(reportId), (list) => list?.filter((e) => e.id !== item.id));
      queryClient.invalidateQueries({ queryKey: evidenceKeys.list(reportId) });
    },
  });
}
