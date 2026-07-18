'use server';

import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import { ValidationError, ApiError, DatabaseError, UnauthorizedError } from '@/lib/errors';
import { supportTicketSchema, type SupportTicketInput } from '@/lib/validations/support';
import { type ActionResponse } from './auth';

/**
 * Creates a new support ticket for the authenticated user.
 */
export async function createSupportTicketAction(input: SupportTicketInput): Promise<ActionResponse<void>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'Support ticket creation attempt started');

  try {
    const result = supportTicketSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([key, val]) => {
        if (val) fieldErrors[key] = val;
      });
      throw new ValidationError('Validation failed for support ticket inputs.', fieldErrors);
    }

    const { subject, message } = result.data;
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('Authentication required. Session expired.');
    }

    try {
      await prisma.supportTicket.create({
        data: {
          userId: user.id,
          subject,
          message,
          status: 'OPEN',
        },
      });

      // Write security audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'SUPPORT_TICKET_CREATED',
          details: { subject },
        },
      });

      log.info({ correlationId, userId: user.id }, 'Support ticket created successfully');
    } catch (dbError) {
      log.error({ correlationId, userId: user.id }, 'Prisma support ticket creation failed', dbError);
      throw new DatabaseError(dbError);
    }

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ApiError || error instanceof DatabaseError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      };
    }

    log.error({ correlationId }, 'Unexpected support ticket creation error', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    };
  }
}
