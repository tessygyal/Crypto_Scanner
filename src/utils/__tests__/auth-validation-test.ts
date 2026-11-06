import {
  loginSchema,
  registerSchema,
  requestResetSchema,
  resetPasswordSchema,
} from '../auth-validation';

/** First error message for each field, for compact assertions. */
function errors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  const out: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const key = String(issue.path[0]);
    out[key] ??= issue.message;
  }
  return out;
}

describe('loginSchema', () => {
  it('accepts a valid email and any non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'kila@example.com', password: 'x' }).success).toBe(true);
  });

  it('trims the email', () => {
    expect(loginSchema.parse({ email: '  kila@example.com ', password: 'x' }).email).toBe('kila@example.com');
  });

  it('explains empty and invalid fields', () => {
    expect(errors(loginSchema.safeParse({ email: '', password: '' }))).toEqual({
      email: 'Enter your email address.',
      password: 'Enter your password.',
    });
    expect(errors(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }))).toEqual({
      email: 'Enter a valid email address.',
    });
  });
});

describe('registerSchema', () => {
  const valid = {
    displayName: 'Kila',
    email: 'kila@example.com',
    password: 'garden123',
    confirmPassword: 'garden123',
  };

  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['short', 'Use at least 8 characters.'],
    ['12345678', 'Include at least one letter.'],
    ['abcdefgh', 'Include at least one number.'],
    ['a1'.repeat(37), 'Use 72 characters or fewer.'],
  ])('rejects password %j', (password, message) => {
    expect(errors(registerSchema.safeParse({ ...valid, password, confirmPassword: password })).password).toBe(message);
  });

  it('requires matching passwords', () => {
    expect(errors(registerSchema.safeParse({ ...valid, confirmPassword: 'garden124' }))).toEqual({
      confirmPassword: 'Passwords do not match.',
    });
  });

  it('checks the display name length', () => {
    expect(errors(registerSchema.safeParse({ ...valid, displayName: ' K ' })).displayName).toBe(
      'Use at least 2 characters.'
    );
    expect(errors(registerSchema.safeParse({ ...valid, displayName: 'K'.repeat(41) })).displayName).toBe(
      'Use 40 characters or fewer.'
    );
  });
});

describe('requestResetSchema', () => {
  it('needs a valid email', () => {
    expect(requestResetSchema.safeParse({ email: 'kila@example.com' }).success).toBe(true);
    expect(requestResetSchema.safeParse({ email: 'kila@' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  const valid = { code: '123456', password: 'newpass99', confirmPassword: 'newpass99' };

  it('accepts a 6–10 digit code', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...valid, code: ' 12345678 ' }).success).toBe(true);
  });

  it.each(['12345', '12a456', '12345678901', ''])('rejects code %j', (code) => {
    expect(errors(resetPasswordSchema.safeParse({ ...valid, code })).code).toBe(
      'Enter the code from the email (numbers only).'
    );
  });

  it('requires matching new passwords', () => {
    expect(errors(resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'other999' }))).toEqual({
      confirmPassword: 'Passwords do not match.',
    });
  });
});
