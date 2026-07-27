import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long.' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
  .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' });

export const signUpSchema = z
  .object({
    email: z
      .string()
      .email({ message: 'Must be a valid email address.' })
      .refine(
        (val) => {
          const domain = val.split('@')[1]?.toLowerCase();
          const blockedDomains = ['mailinator.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'trashmail.com'];
          return !blockedDomains.includes(domain);
        },
        { message: 'Disposable email addresses are not permitted.' }
      ),
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: 'Confirm password is required.' }),
    fullName: z.string().trim().min(1, { message: 'Full name is required.' }).max(100),
    phone: z
      .string()
      .trim()
      .min(1, { message: 'Phone number is required.' })
      .regex(/^\+?[0-9\s\-()]{7,25}$/, { message: 'Must be a valid phone number.' }),
    clinicName: z.string().max(100).optional().or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  rememberMe: z.boolean().default(false).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address.' }),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: 'Confirm password is required.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
