import { NETWORK_ERROR_MESSAGE } from './auth-errors';

/**
 * Turn Supabase database (PostgREST / Postgres) errors into short,
 * plain-language messages. Raw server text is never shown.
 */

export const DB_NOT_SET_UP_MESSAGE =
  'The database is not set up yet. Run the SQL in supabase/migrations in your Supabase project.';

const BY_CODE: Record<string, string> = {
  // PostgREST: table/column missing from the schema cache (migration not applied)
  PGRST205: DB_NOT_SET_UP_MESSAGE,
  PGRST204: DB_NOT_SET_UP_MESSAGE,
  // Postgres: undefined table / column
  '42P01': DB_NOT_SET_UP_MESSAGE,
  '42703': DB_NOT_SET_UP_MESSAGE,
  // Permission / Row Level Security
  '42501': "You don't have permission to do that.",
  // JWT expired or invalid
  PGRST301: 'Your session has expired. Please sign in again.',
  PGRST303: 'Your session has expired. Please sign in again.',
  // Constraint violations
  '23514': 'Some of the details are not valid. Please check and try again.',
  '23505': 'That already exists.',
  '23503': 'That item no longer exists.',
  // Raised by our own functions (e.g. moderate_report) for a missing row
  P0002: 'That item no longer exists.',
};

const FALLBACK = 'Something went wrong. Please try again.';

type ErrorLike = { name?: string; message?: string; code?: string };

export function friendlyDbMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return FALLBACK;
  const e = error as ErrorLike;

  if (e.name === 'SupabaseNotConfiguredError' && e.message) return e.message;
  if (e.code && BY_CODE[e.code]) return BY_CODE[e.code];
  if (e.name === 'TypeError' || /network request failed|failed to fetch|fetch failed/i.test(e.message ?? '')) {
    return NETWORK_ERROR_MESSAGE;
  }
  return FALLBACK;
}

/** An Error whose message is already safe to show to the user. */
export class FriendlyDbError extends Error {
  constructor(cause: unknown) {
    super(friendlyDbMessage(cause));
    this.name = 'FriendlyDbError';
    this.cause = cause;
  }
}
