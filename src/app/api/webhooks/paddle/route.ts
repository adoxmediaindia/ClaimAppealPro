import { NextRequest, NextResponse } from 'next/server';
import getBillingProvider from '@/lib/billing';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import { getPlanByPriceId } from '@/lib/billing/plans';

export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'Paddle webhook POST trigger received');

  const signature = req.headers.get('paddle-signature') || '';
  if (!signature) {
    log.warn({ correlationId }, 'Missing paddle-signature header. Rejecting webhook request.');
    return NextResponse.json({ error: 'Missing paddle-signature header' }, { status: 400 });
  }

  try {
    const rawBody = await req.text();
    const provider = getBillingProvider();
    
    // Paddle webhook secret is read from env
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || 'mock-paddle-webhook-secret';
    
    const event = await provider.constructWebhookEvent(rawBody, signature, webhookSecret);
    log.info({ correlationId, eventType: event.type }, 'Paddle webhook verified and mapped successfully');

    switch (event.type) {
      case 'checkout.completed': {
        const userId = event.metadata?.userId;
        if (!userId) {
          log.error({ correlationId }, 'Paddle checkout event missing userId metadata');
          return NextResponse.json({ error: 'Missing userId metadata' }, { status: 400 });
        }

        // Upsert User Subscription details using Paddle fields
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            paddleCustomerId: event.customerId,
            paddleSubscriptionId: event.subscriptionId || '',
            planId: 'pro',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          },
          update: {
            paddleCustomerId: event.customerId,
            paddleSubscriptionId: event.subscriptionId,
            planId: 'pro',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // Record initial payment record using Paddle fields
        await prisma.payment.create({
          data: {
            userId,
            paddleSessionId: `checkout_${event.subscriptionId || crypto.randomUUID()}`,
            amount: event.amount || 4900, // $49.00 default in cents
            currency: event.currency || 'usd',
            status: 'completed',
          },
        });

        // Log System Audit Event
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'PADDLE_CHECKOUT_COMPLETED',
            details: { customerId: event.customerId, subscriptionId: event.subscriptionId },
          },
        });
        break;
      }

      case 'invoice.paid': {
        const subscription = await prisma.subscription.findUnique({
          where: { paddleCustomerId: event.customerId },
        });

        if (subscription) {
          await prisma.payment.create({
            data: {
              userId: subscription.userId,
              paddleSessionId: `invoice_${event.subscriptionId || crypto.randomUUID()}_${Date.now()}`,
              amount: event.amount || 4900,
              currency: event.currency || 'usd',
              status: 'completed',
            },
          });

          // Log Audit Event
          await prisma.auditLog.create({
            data: {
              userId: subscription.userId,
              action: 'PADDLE_INVOICE_PAID',
              details: { subscriptionId: event.subscriptionId, amount: event.amount },
            },
          });
        }
        break;
      }

      case 'subscription.updated': {
        const subscription = await prisma.subscription.findUnique({
          where: { paddleCustomerId: event.customerId },
        });

        if (subscription) {
          const plan = getPlanByPriceId(event.priceId || '');
          await prisma.subscription.update({
            where: { paddleCustomerId: event.customerId },
            data: {
              paddleSubscriptionId: event.subscriptionId || subscription.paddleSubscriptionId,
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
              action: 'PADDLE_SUBSCRIPTION_UPDATED',
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
          where: { paddleCustomerId: event.customerId },
        });

        if (subscription) {
          // Downgrade subscription to free tier limits
          await prisma.subscription.update({
            where: { paddleCustomerId: event.customerId },
            data: {
              status: 'canceled',
              planId: 'free',
            },
          });

          // Log Audit Event
          await prisma.auditLog.create({
            data: {
              userId: subscription.userId,
              action: 'PADDLE_SUBSCRIPTION_DELETED',
              details: { subscriptionId: event.subscriptionId },
            },
          });
        }
        break;
      }

      default:
        log.info({ eventType: event.type }, 'Ignoring unhandled paddle event type');
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    log.error({ correlationId, error: error.message }, 'Failed to process Paddle Webhook POST event');
    return NextResponse.json({ error: `Webhook handling error: ${error.message}` }, { status: 400 });
  }
}
