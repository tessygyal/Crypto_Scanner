import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  FriendlyAuthError,
  friendlyAuthMessage,
  NETWORK_ERROR_MESSAGE,
  RESEND_COOLDOWN_SECONDS,
  secondsUntilResend,
} from '../auth-errors';

describe('friendlyAuthMessage', () => {
  it.each([
    ['invalid_credentials', 'Email or password is incorrect.'],
    ['email_not_confirmed', 'Please confirm your email first. Check your inbox for the confirmation link.'],
    ['otp_expired', 'That code is wrong or has expired. Request a new code and try again.'],
    ['same_password', 'Your new password must be different from your old one.'],
  ])('maps Supabase code %s', (code, message) => {
    expect(friendlyAuthMessage({ name: 'AuthApiError', message: 'raw server text', code, status: 400 })).toBe(message);
  });

  it('says clearly when an email is already registered (sign-up only)', () => {
    for (const code of ['user_already_exists', 'email_exists', 'email_already_registered']) {
      expect(friendlyAuthMessage({ code })).toBe(EMAIL_ALREADY_REGISTERED_MESSAGE);
    }
    expect(EMAIL_ALREADY_REGISTERED_MESSAGE).toMatch(/already exists/);
  });

  it('sign-in errors still do not reveal whether an account exists', () => {
    expect(friendlyAuthMessage({ code: 'invalid_credentials' })).not.toMatch(/exist|registered|no account/i);
  });

  it('explains the email rate limit without raw server text', () => {
    const message = friendlyAuthMessage({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded', status: 429 });
    expect(message).toMatch(/wait a minute/);
    expect(message).not.toMatch(/exceeded/);
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

  it('keeps the Supabase code so screens can offer the next step', () => {
    expect(new FriendlyAuthError({ code: 'email_not_confirmed' }).code).toBe('email_not_confirmed');
    expect(new FriendlyAuthError(new TypeError('Network request failed')).code).toBeUndefined();
  });
});

describe('secondsUntilResend', () => {
  it('is 0 before anything was sent', () => {
    expect(secondsUntilResend(null, 1_000)).toBe(0);
  });

  it('counts down from the cooldown in whole seconds', () => {
    const sent = 10_000;
    expect(secondsUntilResend(sent, sent)).toBe(RESEND_COOLDOWN_SECONDS);
    expect(secondsUntilResend(sent, sent + 500)).toBe(RESEND_COOLDOWN_SECONDS);
    expect(secondsUntilResend(sent, sent + 59_001, 60)).toBe(1);
    expect(secondsUntilResend(sent, sent + 60_000, 60)).toBe(0);
    expect(secondsUntilResend(sent, sent + 90_000, 60)).toBe(0);
  });

  it('follows a shorter cooldown if the Supabase limit is lowered', () => {
    expect(secondsUntilResend(0, 0, 5)).toBe(5);
    expect(secondsUntilResend(0, 5_000, 5)).toBe(0);
  });
});
