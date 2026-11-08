import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/auth-provider';
import { isModerator, moderateReport, type ModerationDecision } from '@/services/moderation';

/**
 * Whether the signed-in user is a moderator. Kept under the "profile" root so it
 * is saved on the phone with the profile and the Review tab works offline.
 */
export function useIsModerator() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', 'is-moderator', user?.id],
    queryFn: isModerator,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useModerateReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ decision, note }: { decision: ModerationDecision; note: string }) =>
      moderateReport(reportId, decision, note),
    onSuccess: () => {
      // The report moves between lists (review → community) and the map.
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'detail', reportId] });
    },
  });
}
