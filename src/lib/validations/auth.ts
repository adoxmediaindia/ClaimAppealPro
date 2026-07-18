import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long.' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
  .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' });

export const signUpSchema = z.object({
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

  firstName: z.string().min(1, { message: 'First name is required.' }).max(50),
  lastName: z.string().min(1, { message: 'Last name is required.' }).max(50),
  clinicName: z.string().max(100).optional(),
  npiNumber: z
    .string()
    .length(10, { message: 'NPI number must be exactly 10 digits.' })
    .regex(/^\d+$/, { message: 'NPI number must contain digits only.' })
    .optional()
    .or(z.literal('')),
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
