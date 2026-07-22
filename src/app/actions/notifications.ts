'use server';

import prisma from '@/lib/prisma';
import { createServerSideClient } from '@/lib/supabase';
import { UnauthorizedError } from '@/lib/errors';
import log from '@/lib/logger';
import { type ActionResponse } from './auth';

export async function markNotificationsReadAction(): Promise<ActionResponse<{ success: boolean }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'Marking all user notifications as read');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('Authentication required.');
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: {
        read: true,
      },
    });

    log.info({ correlationId, userId: user.id }, 'All notifications marked read successfully');
    return {
      success: true,
      data: { success: true },
    };
  } catch (err: any) {
    log.error({ correlationId, error: err.message }, 'Failed to mark notifications read');
    return {
      success: false,
      error: {
        code: err.errorCode || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.',
      },
    };
  }
}

export async function fetchNotificationsAction(): Promise<ActionResponse<any[]>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'Fetching active user notification logs');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('Authentication required.');
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      success: true,
      data: notifications,
    };
  } catch (err: any) {
    log.error({ correlationId, error: err.message }, 'Failed to fetch user notifications');
    return {
      success: false,
      error: {
        code: err.errorCode || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.',
      },
    };
  }
}
