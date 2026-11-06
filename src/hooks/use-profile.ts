import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/auth-provider';
import { getProfile, updateDisplayName } from '@/services/profile';

export const profileKey = (userId: string | undefined) => ['profile', userId] as const;

/** The signed-in user's profile from the `profiles` table. */
export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: profileKey(user?.id),
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
  });
}

export function useUpdateDisplayName() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string) => updateDisplayName(user!.id, displayName),
    onSuccess: (profile) => queryClient.setQueryData(profileKey(user?.id), profile),
  });
}
