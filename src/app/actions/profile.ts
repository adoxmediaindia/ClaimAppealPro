'use server';

import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import { ValidationError, ApiError, DatabaseError, UnauthorizedError } from '@/lib/errors';
import { profileSchema, type ProfileInput } from '@/lib/validations/profile';
import { type ActionResponse } from './auth';

function normalizePhone(phone: string): string {
  const cleaned = phone.trim();
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Updates the profile of the authenticated user.
 */
export async function updateProfileAction(input: ProfileInput): Promise<ActionResponse<void>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'User profile update attempt started');

  try {
    const result = profileSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([key, val]) => {
        if (val) fieldErrors[key] = val;
      });
      throw new ValidationError('Validation failed for profile inputs.', fieldErrors);
    }

    const { firstName, lastName, clinicName, npiNumber, phone } = result.data;
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('Authentication required. Session expired.');
    }

    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Update public user profile and record in prisma
    try {
      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          firstName,
          lastName,
          phone: normalizedPhone,
          clinicName: clinicName || null,
          npiNumber: npiNumber || null,
        },
        create: {
          userId: user.id,
          firstName,
          lastName,
          phone: normalizedPhone,
          clinicName: clinicName || null,
          npiNumber: npiNumber || null,
        },
      });

      // Write security audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PROFILE_UPDATED',
          details: { clinicName, npiNumber },
        },
      });

      log.info({ correlationId, userId: user.id }, 'User profile updated successfully');
    } catch (dbError) {
      log.error({ correlationId, userId: user.id }, 'Prisma profile update failed', dbError);
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

    log.error({ correlationId }, 'Unexpected profile update error', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    };
  }
}
