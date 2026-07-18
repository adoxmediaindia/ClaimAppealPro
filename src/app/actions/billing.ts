'use server';

import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import getBillingProvider from '@/lib/billing';
import config from '@/config';
import log from '@/lib/logger';
import { UnauthorizedError, ApiError } from '@/lib/errors';
import { type ActionResponse } from './auth';

/**
 * Creates a Stripe Checkout Session for upgrading to the Pro plan.
 * Verifies authentication context before requesting payment provider session.
 */
export async function createCheckoutSessionAction(priceId: string): Promise<ActionResponse<{ url: string }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, priceId }, 'Initiating billing checkout session request');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('Authentication required. Session expired or missing.');
    }

    // Retrieve active subscription to check if already upgraded
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (subscription && subscription.status === 'active' && subscription.planId === 'pro') {
      return {
        success: false,
        error: {
          code: 'ACTIVE_SUBSCRIPTION_EXISTS',
          message: 'You already have an active Professional Pro subscription plan.',
        },
      };
    }

    const provider = getBillingProvider();
    const successUrl = `${config.APP_URL}/billing`;
    const cancelUrl = `${config.APP_URL}/billing`;

    const session = await provider.createCheckoutSession({
      userId: user.id,
      email: user.email || '',
      priceId,
      successUrl,
      cancelUrl,
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'BILLING_CHECKOUT_INITIATED',
        details: { priceId, sessionId: session.sessionId },
      },
    });

    return {
      success: true,
      data: {
        url: session.url,
      },
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      };
    }

    log.error({ correlationId, error: error.message }, 'Failed to create checkout session');
    return {
      success: false,
      error: {
        code: 'CHECKOUT_SESSION_FAILED',
        message: error.message || 'Failed to initialize payment checkout portal.',
      },
    };
  }
}

/**
 * Creates a Customer Portal Session for managing subscriptions.
 */
export async function createCustomerPortalAction(): Promise<ActionResponse<{ url: string }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'Initiating customer billing portal request');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('Authentication required.');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      return {
        success: false,
        error: {
          code: 'NO_BILLING_CUSTOMER',
          message: 'No billing profile associated with your account. Upgrade plan first.',
        },
      };
    }

    const provider = getBillingProvider();
    const returnUrl = `${config.APP_URL}/billing`;

    const session = await provider.createPortalSession(subscription.stripeCustomerId, returnUrl);

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'BILLING_PORTAL_OPENED',
        details: { stripeCustomerId: subscription.stripeCustomerId },
      },
    });

    return {
      success: true,
      data: {
        url: session.url,
      },
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      };
    }

    log.error({ correlationId, error: error.message }, 'Failed to open billing portal');
    return {
      success: false,
      error: {
        code: 'BILLING_PORTAL_FAILED',
        message: error.message || 'Failed to load subscription management portal.',
      },
    };
  }
}

/**
 * Fetches invoice history logs for the active user.
 */
export async function fetchInvoiceHistoryAction(): Promise<ActionResponse<any[]>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'Fetching user invoice history');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('Authentication required.');
    }

    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: payments,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      };
    }

    log.error({ correlationId, error: error.message }, 'Failed to fetch invoice history');
    return {
      success: false,
      error: {
        code: 'FETCH_INVOICES_FAILED',
        message: 'An unexpected error occurred while fetching billing logs.',
      },
    };
  }
}
