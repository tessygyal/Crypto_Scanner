import { FriendlyAuthError, friendlyAuthMessage, NETWORK_ERROR_MESSAGE } from '../auth-errors';

describe('friendlyAuthMessage', () => {
  it.each([
    ['invalid_credentials', 'Email or password is incorrect.'],
    ['email_not_confirmed', 'Please confirm your email first. Check your inbox for the confirmation link.'],
    ['otp_expired', 'That code is wrong or has expired. Request a new code and try again.'],
    ['over_email_send_rate_limit', 'Too many emails sent. Please wait a few minutes and try again.'],
    ['same_password', 'Your new password must be different from your old one.'],
  ])('maps Supabase code %s', (code, message) => {
    expect(friendlyAuthMessage({ name: 'AuthApiError', message: 'raw server text', code, status: 400 })).toBe(message);
  });

  it('does not reveal whether an account exists on sign-up', () => {
    const message = friendlyAuthMessage({ code: 'user_already_exists' });
    expect(message).not.toMatch(/already (registered|exists)/i);
  });

  it('detects network failures', () => {
    expect(friendlyAuthMessage(new TypeError('Network request failed'))).toBe(NETWORK_ERROR_MESSAGE);
    expect(friendlyAuthMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 })).toBe(
      NETWORK_ERROR_MESSAGE
    );
  });

  it('treats HTTP 429 as rate limiting', () => {
    expect(friendlyAuthMessage({ name: 'AuthApiError', message: 'x', status: 429 })).toMatch(/Too many attempts/);
  });

  it('passes through the not-configured message', () => {
    const e = new Error('Supabase is not configured. Copy .env.example…');
    e.name = 'SupabaseNotConfiguredError';
    expect(friendlyAuthMessage(e)).toBe(e.message);
  });

  it('falls back to a generic message and never shows raw server text', () => {
    expect(friendlyAuthMessage({ name: 'AuthApiError', message: 'pq: relation does not exist', status: 500 })).toBe(
      'Something went wrong. Please try again.'
    );
    expect(friendlyAuthMessage(undefined)).toBe('Something went wrong. Please try again.');
    expect(friendlyAuthMessage('boom')).toBe('Something went wrong. Please try again.');
  });
});

describe('FriendlyAuthError', () => {
  it('carries the friendly message and the original cause', () => {
    const cause = { code: 'invalid_credentials' };
    const err = new FriendlyAuthError(cause);
    expect(err.message).toBe('Email or password is incorrect.');
    expect(err.cause).toBe(cause);
    expect(err).toBeInstanceOf(Error);
  });
});
