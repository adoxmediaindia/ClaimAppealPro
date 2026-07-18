import { z } from 'zod';

export const supportTicketSchema = z.object({
  subject: z
    .string()
    .min(3, { message: 'Subject must be at least 3 characters.' })
    .max(255, { message: 'Subject cannot exceed 255 characters.' }),
  message: z
    .string()
    .min(10, { message: 'Message description must be at least 10 characters.' }),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
