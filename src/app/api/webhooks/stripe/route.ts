import { NextRequest, NextResponse } from 'next/server';
import getBillingProvider from '@/lib/billing';
import prisma from '@/lib/prisma';
import config from '@/config';
import log from '@/lib/logger';
import { getPlanByPriceId } from '@/lib/billing/plans';

export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'Stripe webhook POST trigger received');

  const signature = req.headers.get('stripe-signature') || '';
  if (!signature) {
    log.warn({ correlationId }, 'Missing stripe-signature header. Rejecting webhook request.');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  try {
    const rawBody = await req.text();
    const provider = getBillingProvider();
    const event = await provider.constructWebhookEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);

    log.info({ correlationId, eventType: event.type }, 'Stripe webhook verified and mapped');

    switch (event.type) {
      case 'checkout.completed': {
        const userId = event.metadata?.userId;
        if (!userId) {
          log.error({ correlationId }, 'Stripe checkout event missing userId metadata');
          return NextResponse.json({ error: 'Missing userId metadata' }, { status: 400 });
        }

        // Upsert User Subscription details
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: event.customerId,
            stripeSubscriptionId: event.subscriptionId || '',
            planId: 'pro', // Starter upgrade is to Pro plan
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          },
          update: {
            stripeCustomerId: event.customerId,
            stripeSubscriptionId: event.subscriptionId,
            planId: 'pro',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // Record initial payment record
        await prisma.payment.create({
          data: {
            userId,
            stripeSessionId: `checkout_${event.subscriptionId || crypto.randomUUID()}`,
            amount: event.amount || 4900, // $49.00 default in cents
            currency: event.currency || 'usd',
            status: 'completed',
          },
        });

        // Log System Audit Event
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'STRIPE_CHECKOUT_COMPLETED',
            details: { customerId: event.customerId, subscriptionId: event.subscriptionId },
          },
        });
        break;
      }

      case 'invoice.paid': {
        const subscription = await prisma.subscription.findUnique({
          where: { stripeCustomerId: event.customerId },
        });

        if (subscription) {
          await prisma.payment.create({
            data: {
              userId: subscription.userId,
              stripeSessionId: `invoice_${event.subscriptionId || crypto.randomUUID()}_${Date.now()}`,
              amount: event.amount || 4900,
              currency: event.currency || 'usd',
              status: 'completed',
            },
          });

          // Log Audit Event
          await prisma.auditLog.create({
            data: {
              userId: subscription.userId,
              action: 'STRIPE_INVOICE_PAID',
              details: { subscriptionId: event.subscriptionId, amount: event.amount },
            },
          });
        }
        break;
      }

      case 'subscription.updated': {
        const subscription = await prisma.subscription.findUnique({
          where: { stripeCustomerId: event.customerId },
        });

        if (subscription) {
          const plan = getPlanByPriceId(event.priceId || '');
          await prisma.subscription.update({
            where: { stripeCustomerId: event.customerId },
            data: {
              stripeSubscriptionId: event.subscriptionId || subscription.stripeSubscriptionId,
              planId: plan.planId,
              status: event.status || 'active',
              currentPeriodStart: event.currentPeriodStart || new Date(),
              currentPeriodEnd: event.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              cancelAtPeriodEnd: event.cancelAtPeriodEnd ?? false,
            },
          });

          // Log Audit Event
          await prisma.auditLog.create({
            data: {
              userId: subscription.userId,
              action: 'STRIPE_SUBSCRIPTION_UPDATED',
              details: {
                subscriptionId: event.subscriptionId,
                status: event.status,
                planId: plan.planId,
              },
            },
          });
        }
        break;
      }

      case 'subscription.deleted': {
        const subscription = await prisma.subscription.findUnique({
          where: { stripeCustomerId: event.customerId },
        });

        if (subscription) {
          // Downgrade subscription to free tier limits
          await prisma.subscription.update({
            where: { stripeCustomerId: event.customerId },
            data: {
              status: 'canceled',
              planId: 'free',
            },
          });

          // Log Audit Event
          await prisma.auditLog.create({
            data: {
              userId: subscription.userId,
              action: 'STRIPE_SUBSCRIPTION_DELETED',
              details: { subscriptionId: event.subscriptionId },
            },
          });
        }
        break;
      }

      default:
        log.info({ eventType: event.type }, 'Ignoring unhandled stripe event type');
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    log.error({ correlationId, error: error.message }, 'Failed to process Stripe Webhook POST event');
    return NextResponse.json({ error: `Webhook handling error: ${error.message}` }, { status: 400 });
  }
}
