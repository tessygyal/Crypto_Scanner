/**
 * Turn Supabase Auth errors into short, plain-language messages.
 *
 * Sign-up says when an email is already registered (a deliberate choice, so
 * people aren't left waiting for an email that will never come). Sign-in and
 * password reset still never reveal whether an email has an account.
 */

export const EMAIL_ALREADY_REGISTERED_MESSAGE =
  'An account with this email already exists. Sign in, or use "Forgot your password?" if you can’t remember it.';

const BY_CODE: Record<string, string> = {
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Please confirm your email first. Check your inbox for the confirmation link.',
  user_already_exists: EMAIL_ALREADY_REGISTERED_MESSAGE,
  email_exists: EMAIL_ALREADY_REGISTERED_MESSAGE,
  email_already_registered: EMAIL_ALREADY_REGISTERED_MESSAGE,
  weak_password: 'That password is too weak. Use at least 8 characters with letters and numbers.',
  same_password: 'Your new password must be different from your old one.',
  otp_expired: 'That code is wrong or has expired. Request a new code and try again.',
  over_email_send_rate_limit:
    'Too many emails have been sent. Please wait a minute and try again. (The free Supabase email service only sends a few emails per hour.)',
  over_request_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  email_address_invalid: 'Enter a valid email address.',
  signup_disabled: 'New sign-ups are currently turned off.',
  email_provider_disabled: 'Email sign-in is currently turned off.',
  user_banned: 'This account has been suspended.',
};

export const NETWORK_ERROR_MESSAGE = 'Could not connect. Check your internet connection and try again.';
const FALLBACK = 'Something went wrong. Please try again.';

type ErrorLike = { name?: string; message?: string; code?: string; status?: number };

export function friendlyAuthMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return FALLBACK;
  const e = error as ErrorLike;

  if (e.name === 'SupabaseNotConfiguredError' && e.message) return e.message;
  if (e.code && BY_CODE[e.code]) return BY_CODE[e.code];

  // Network failures surface as fetch TypeErrors or Supabase "retryable" errors.
  if (e.name === 'AuthRetryableFetchError' || e.name === 'TypeError' || /network|fetch/i.test(e.message ?? '')) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (e.status === 429) return BY_CODE.over_request_rate_limit;

  return FALLBACK;
}

/** An Error whose message is already safe to show to the user. */
export class FriendlyAuthError extends Error {
  /** Supabase's error code (e.g. "email_not_confirmed"), so screens can offer the right next step. */
  readonly code: string | undefined;

  constructor(cause: unknown) {
    super(friendlyAuthMessage(cause));
    this.name = 'FriendlyAuthError';
    this.cause = cause;
    const code = cause && typeof cause === 'object' ? (cause as ErrorLike).code : undefined;
    this.code = typeof code === 'string' ? code : undefined;
  }
}

/** Seconds to wait between confirmation emails. Match Authentication → Rate Limits in Supabase (default 60). */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Whole seconds left before another email may be requested (0 = now). */
export function secondsUntilResend(lastSentAt: number | null, now: number, cooldown = RESEND_COOLDOWN_SECONDS): number {
  if (lastSentAt === null) return 0;
  return Math.max(0, Math.ceil((lastSentAt + cooldown * 1000 - now) / 1000));
}
