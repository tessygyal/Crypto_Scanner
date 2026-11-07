import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  requestPasswordReset,
  resendConfirmation,
  resetPasswordWithCode,
  signIn,
  signOut,
  signUp,
} from '@/services/auth';

/**
 * Auth actions as TanStack Query mutations. Each exposes isPending (loading),
 * isSuccess / data (success) and error (a FriendlyAuthError) to the screen.
 * Navigation after sign-in/out happens automatically via protected routes.
 */

export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}

export function useResendConfirmation() {
  return useMutation({ mutationFn: resendConfirmation });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useResetPassword() {
  return useMutation({ mutationFn: resetPasswordWithCode });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    // Drop any cached data belonging to the signed-out user.
    onSuccess: () => queryClient.clear(),
  });
}
