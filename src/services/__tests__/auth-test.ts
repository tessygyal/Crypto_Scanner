import {
  getSession,
  onSessionChange,
  requestPasswordReset,
  resendConfirmation,
  resetPasswordWithCode,
  signIn,
  signOut,
  signUp,
} from '../auth';

// A fake Supabase client, so the service logic runs without a real project.
const mockAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  resend: jest.fn(),
  verifyOtp: jest.fn(),
  updateUser: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
};
let mockConfigured = true;

jest.mock('../supabase', () => ({
  get supabase() {
    return mockConfigured ? { auth: mockAuth } : null;
  },
  requireSupabase: () => {
    if (!mockConfigured) {
      const e = new Error('Supabase is not mockConfigured. Copy .env.example to .env.');
      e.name = 'SupabaseNotConfiguredError';
      throw e;
    }
    return { auth: mockAuth };
  },
}));

const ok = (data: unknown = {}) => Promise.resolve({ data, error: null });
const fail = (code: string) => Promise.resolve({ data: {}, error: { name: 'AuthApiError', code, status: 400 } });

beforeEach(() => {
  jest.resetAllMocks();
  mockConfigured = true;
});

describe('signIn', () => {
  it('signs in with email and password', async () => {
    mockAuth.signInWithPassword.mockReturnValue(ok({ session: {} }));
    await signIn({ email: 'kila@example.com', password: 'garden123' });
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'kila@example.com', password: 'garden123' });
  });

  it('throws a friendly message for wrong credentials', async () => {
    mockAuth.signInWithPassword.mockReturnValue(fail('invalid_credentials'));
    await expect(signIn({ email: 'a@b.co', password: 'x' })).rejects.toThrow('Email or password is incorrect.');
  });

  it('throws a friendly message when the network fails', async () => {
    mockAuth.signInWithPassword.mockRejectedValue(new TypeError('Network request failed'));
    await expect(signIn({ email: 'a@b.co', password: 'x' })).rejects.toThrow(/Could not connect/);
  });

  it('explains when Supabase is not mockConfigured', async () => {
    mockConfigured = false;
    await expect(signIn({ email: 'a@b.co', password: 'x' })).rejects.toThrow(/not mockConfigured/);
  });
});

describe('signUp', () => {
  const input = { email: 'kila@example.com', password: 'garden123', displayName: 'Kila' };

  it('stores the display name in user metadata', async () => {
    mockAuth.signUp.mockReturnValue(ok({ user: {}, session: null }));
    await signUp(input);
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'kila@example.com',
      password: 'garden123',
      options: { data: { display_name: 'Kila' } },
    });
  });

  it('reports when email confirmation is needed (no session yet)', async () => {
    mockAuth.signUp.mockReturnValue(ok({ user: {}, session: null }));
    await expect(signUp(input)).resolves.toEqual({ needsEmailConfirmation: true });
  });

  it('reports when the user is signed in straight away', async () => {
    mockAuth.signUp.mockReturnValue(ok({ user: {}, session: { access_token: 't' } }));
    await expect(signUp(input)).resolves.toEqual({ needsEmailConfirmation: false });
  });

  it('says the email is already registered (confirm email on: user with no identities)', async () => {
    mockAuth.signUp.mockReturnValue(ok({ user: { id: 'x', identities: [] }, session: null }));
    await expect(signUp(input)).rejects.toMatchObject({ code: 'email_already_registered', message: expect.stringMatching(/already exists/) });
  });

  it('says the email is already registered (confirm email off: user_already_exists error)', async () => {
    mockAuth.signUp.mockReturnValue(fail('user_already_exists'));
    await expect(signUp(input)).rejects.toThrow(/already exists/);
  });

  it('a new user with an identity is not mistaken for an existing one', async () => {
    mockAuth.signUp.mockReturnValue(ok({ user: { id: 'x', identities: [{ id: 'i' }] }, session: null }));
    await expect(signUp(input)).resolves.toEqual({ needsEmailConfirmation: true });
  });
});

describe('resendConfirmation', () => {
  it('asks Supabase to resend the sign-up email', async () => {
    mockAuth.resend.mockReturnValue(ok());
    await resendConfirmation('a@b.co');
    expect(mockAuth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.co' });
  });

  it('turns the rate limit into a friendly message', async () => {
    mockAuth.resend.mockReturnValue(fail('over_email_send_rate_limit'));
    await expect(resendConfirmation('a@b.co')).rejects.toThrow(/wait a minute/);
  });
});

describe('password reset', () => {
  it('requests a reset email', async () => {
    mockAuth.resetPasswordForEmail.mockReturnValue(ok());
    await requestPasswordReset('kila@example.com');
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('kila@example.com');
  });

  it('verifies the code, then sets the new password', async () => {
    mockAuth.verifyOtp.mockReturnValue(ok({ session: {} }));
    mockAuth.updateUser.mockReturnValue(ok({ user: {} }));
    await resetPasswordWithCode({ email: 'kila@example.com', code: '123456', password: 'newpass99' });
    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ email: 'kila@example.com', token: '123456', type: 'recovery' });
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpass99' });
    expect(mockAuth.verifyOtp.mock.invocationCallOrder[0]).toBeLessThan(mockAuth.updateUser.mock.invocationCallOrder[0]);
  });

  it('does not change the password when the code is wrong', async () => {
    mockAuth.verifyOtp.mockReturnValue(fail('otp_expired'));
    await expect(
      resetPasswordWithCode({ email: 'kila@example.com', code: '000000', password: 'newpass99' })
    ).rejects.toThrow(/wrong or has expired/);
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });
});

describe('session helpers', () => {
  it('returns the stored session', async () => {
    const session = { access_token: 't' };
    mockAuth.getSession.mockResolvedValue({ data: { session }, error: null });
    await expect(getSession()).resolves.toBe(session);
  });

  it('returns null when not mockConfigured or on error', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'x' } });
    await expect(getSession()).resolves.toBeNull();
    mockConfigured = false;
    await expect(getSession()).resolves.toBeNull();
  });

  it('subscribes and unsubscribes to session changes', () => {
    const unsubscribe = jest.fn();
    mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
    const callback = jest.fn();
    const stop = onSessionChange(callback);

    const listener = mockAuth.onAuthStateChange.mock.calls[0][0];
    listener('SIGNED_IN', { access_token: 't' });
    expect(callback).toHaveBeenCalledWith({ access_token: 't' });

    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('signs out, and surfaces errors in friendly form', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();

    mockAuth.signOut.mockResolvedValue({ error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } });
    await expect(signOut()).rejects.toThrow(/Could not connect/);
  });
});
