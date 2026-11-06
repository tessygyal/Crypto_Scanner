import { z } from 'zod';

/** Form schemas for the auth screens (react-hook-form + zod). */

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .pipe(z.email('Enter a valid email address.'));

/** At least 8 characters with a letter and a number. */
const newPassword = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

/** Shown on reports; stored in the profiles table (2–40 characters, checked by the DB too). */
const displayName = z
  .string()
  .trim()
  .min(2, 'Use at least 2 characters.')
  .max(40, 'Use 40 characters or fewer.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName,
    email,
    password: newPassword,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
export type RegisterForm = z.infer<typeof registerSchema>;

export const requestResetSchema = z.object({ email });
export type RequestResetForm = z.infer<typeof requestResetSchema>;

export const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6,10}$/, 'Enter the code from the email (numbers only).'),
    password: newPassword,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const editProfileSchema = z.object({ displayName });
export type EditProfileForm = z.infer<typeof editProfileSchema>;
