import { Redirect } from 'expo-router';

import { useAuth } from '@/context/auth-provider';

/**
 * Entry route ("/"). Not protected, so it always exists; it sends the user to
 * the right place for their session. (A protected screen as the very first
 * route can render blank instead of redirecting.)
 */
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/check' : '/login'} />;
}
