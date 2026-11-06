import { NETWORK_ERROR_MESSAGE } from '../auth-errors';
import { DB_NOT_SET_UP_MESSAGE, FriendlyDbError, friendlyDbMessage } from '../db-errors';

describe('friendlyDbMessage', () => {
  it.each(['PGRST205', '42P01', '42703'])('explains a missing migration (%s)', (code) => {
    expect(friendlyDbMessage({ code, message: 'relation "public.profiles" does not exist' })).toBe(
      DB_NOT_SET_UP_MESSAGE
    );
  });

  it('explains permission / RLS errors without server detail', () => {
    expect(friendlyDbMessage({ code: '42501', message: 'new row violates row-level security policy' })).toBe(
      "You don't have permission to do that."
    );
  });

  it('explains expired sessions and invalid input', () => {
    expect(friendlyDbMessage({ code: 'PGRST301' })).toMatch(/session has expired/);
    expect(friendlyDbMessage({ code: '23514', message: 'violates check constraint' })).toMatch(/not valid/);
  });

  it('detects network failures', () => {
    expect(friendlyDbMessage(new TypeError('Network request failed'))).toBe(NETWORK_ERROR_MESSAGE);
    expect(friendlyDbMessage({ message: 'TypeError: Failed to fetch' })).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('passes through the not-configured message', () => {
    const e = new Error('Supabase is not configured. Copy .env.example…');
    e.name = 'SupabaseNotConfiguredError';
    expect(friendlyDbMessage(e)).toBe(e.message);
  });

  it('never shows raw server text for unknown errors', () => {
    expect(friendlyDbMessage({ code: 'XX000', message: 'internal: stack trace…' })).toBe(
      'Something went wrong. Please try again.'
    );
    expect(friendlyDbMessage(null)).toBe('Something went wrong. Please try again.');
  });

  it('FriendlyDbError keeps the cause', () => {
    const cause = { code: '42501' };
    const err = new FriendlyDbError(cause);
    expect(err.message).toBe("You don't have permission to do that.");
    expect(err.cause).toBe(cause);
  });
});
