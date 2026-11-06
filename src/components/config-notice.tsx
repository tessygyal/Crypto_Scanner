import { FormMessage } from '@/components/form/form-message';
import { useAuth } from '@/context/auth-provider';

/** Shown on auth screens when the app has no Supabase config, so sign-in cannot work yet. */
export function ConfigNotice() {
  const { isConfigured } = useAuth();
  if (isConfigured) return null;
  return (
    <FormMessage
      tone="error"
      title="Supabase is not configured"
      message="Sign-in won't work yet. Copy .env.example to .env, add your Supabase URL and publishable key, then restart with `npx expo start --clear`."
    />
  );
}
