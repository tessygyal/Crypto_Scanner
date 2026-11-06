import type { Profile } from '@/types/database';

import { db, run } from './db';

/** Profile reads/writes. Every function throws `FriendlyDbError` on failure. */

const COLUMNS = 'id, display_name, created_at, updated_at';

/** The signed-in user's profile, or null if it doesn't exist (yet). */
export async function getProfile(userId: string): Promise<Profile | null> {
  return run(db().from('profiles').select(COLUMNS).eq('id', userId).maybeSingle());
}

export async function updateDisplayName(userId: string, displayName: string): Promise<Profile> {
  return run(
    db()
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', userId)
      .select(COLUMNS)
      .single()
  );
}
