import Stripe from 'stripe';
import { BillingProvider, CheckoutSessionParams, BillingEvent } from './provider';
import log from '@/lib/logger';
import { ApiError } from '@/lib/errors';

export class StripeBillingProvider implements BillingProvider {
  private stripe: Stripe | null = null;

  private getStripe(): Stripe {
    if (!this.stripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey || secretKey.includes('your-stripe-key')) {
        throw new ApiError(400, 'STRIPE_KEY_MISSING', 'Stripe payment gateway is not configured.');
      }
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2024-04-10' as any,
      });
    }
    return this.stripe;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string; sessionId: string }> {
    log.info({ userId: params.userId, email: params.email }, 'Creating Stripe checkout session');
    const stripe = this.getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: params.email,
      metadata: {
        userId: params.userId,
      },
      success_url: params.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: params.cancelUrl,
    });

    if (!session.url) {
      throw new ApiError(500, 'STRIPE_SESSION_ERROR', 'Stripe failed to return a checkout session URL.');
    }

    return {
      url: session.url,
      sessionId: session.id,
    };
  }

  async createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<{ url: string }> {
    log.info({ stripeCustomerId }, 'Creating Stripe customer portal session');
    const stripe = this.getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  }

  async constructWebhookEvent(rawBody: string, signature: string, secret: string): Promise<BillingEvent> {
    log.info({}, 'Verifying Stripe webhook event signature');
    const stripe = this.getStripe();

    if (!secret) {
      throw new ApiError(400, 'STRIPE_WEBHOOK_SECRET_MISSING', 'Stripe webhook secret is not configured.');
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    return this.mapStripeEventToBillingEvent(event);
  }

  private mapStripeEventToBillingEvent(event: any): BillingEvent {
    const type = event.type;
    const obj = event.data?.object;

    if (!obj) {
      return { type: 'unknown', customerId: '' };
    }

    switch (type) {
      case 'checkout.session.completed':
        return {
          type: 'checkout.completed',
          customerId: obj.customer as string,
          subscriptionId: obj.subscription as string,
          amount: obj.amount_total || 0,
          currency: obj.currency || 'USD',
          metadata: obj.metadata || {},
        };
      case 'invoice.paid':
        return {
          type: 'invoice.paid',
          customerId: obj.customer as string,
          subscriptionId: obj.subscription as string,
          amount: obj.amount_paid || 0,
          currency: obj.currency || 'USD',
        };
      case 'customer.subscription.updated':
        return {
          type: 'subscription.updated',
          customerId: obj.customer as string,
          subscriptionId: obj.id as string,
          status: obj.status as string,
          priceId: obj.items?.data?.[0]?.price?.id as string,
          cancelAtPeriodEnd: obj.cancel_at_period_end || false,
          currentPeriodStart: new Date(obj.current_period_start * 1000),
          currentPeriodEnd: new Date(obj.current_period_end * 1000),
        };
      case 'customer.subscription.deleted':
        return {
          type: 'subscription.deleted',
          customerId: obj.customer as string,
          subscriptionId: obj.id as string,
          status: obj.status as string,
        };
      default:
        return {
          type: 'unknown',
          customerId: obj.customer || '',
        };
    }
  }
}
