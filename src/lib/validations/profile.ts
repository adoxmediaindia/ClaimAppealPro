import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }).max(50),
  lastName: z.string().min(1, { message: 'Last name is required.' }).max(50),
  clinicName: z.string().max(100).optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,25}$/, { message: 'Must be a valid phone number.' })
    .optional()
    .or(z.literal('')),
  npiNumber: z
    .string()
    .length(10, { message: 'NPI number must be exactly 10 digits.' })
    .regex(/^\d+$/, { message: 'NPI number must contain digits only.' })
    .optional()
    .or(z.literal('')),
});

export type ProfileInput = z.infer<typeof profileSchema>;
