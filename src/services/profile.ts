import type { Profile } from '@/types/database';
import { FriendlyDbError } from '@/utils/db-errors';

import { requireSupabase } from './supabase';

/** Profile reads/writes. Every function throws `FriendlyDbError` on failure. */

const COLUMNS = 'id, display_name, created_at, updated_at';

function client() {
  try {
    return requireSupabase();
  } catch (e) {
    throw new FriendlyDbError(e);
  }
}

/** The signed-in user's profile, or null if it doesn't exist (yet). */
export async function getProfile(userId: string): Promise<Profile | null> {
  const db = client();
  let result;
  try {
    result = await db.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle();
  } catch (e) {
    throw new FriendlyDbError(e);
  }
  if (result.error) throw new FriendlyDbError(result.error);
  return result.data;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<Profile> {
  const db = client();
  let result;
  try {
    result = await db
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', userId)
      .select(COLUMNS)
      .single();
  } catch (e) {
    throw new FriendlyDbError(e);
  }
  if (result.error) throw new FriendlyDbError(result.error);
  return result.data;
}
