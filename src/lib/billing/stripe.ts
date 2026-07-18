import Stripe from 'stripe';
import { BillingProvider, CheckoutSessionParams, BillingEvent } from './provider';
import log from '@/lib/logger';

export class StripeBillingProvider implements BillingProvider {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock-stripe-secret-key';
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-04-10' as any, // Stable API Version
    });
  }

  private isMockMode(): boolean {
    const key = process.env.STRIPE_SECRET_KEY || '';
    return (
      process.env.NODE_ENV === 'test' ||
      key === 'sk_test_mock-stripe-secret-key' ||
      key === 'sk_test_your-stripe-key' ||
      key.includes('your-stripe-key') ||
      key.includes('mock')
    );
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string; sessionId: string }> {
    log.info({ userId: params.userId, email: params.email }, 'Creating Stripe checkout session');
    
    // Offline / Mock check bypass for testing
    if (this.isMockMode()) {
      log.info({}, 'Executing mock Stripe checkout session creation');
      return {
        url: `${params.successUrl}?session_id=mock_session_${crypto.randomUUID()}`,
        sessionId: `mock_session_${crypto.randomUUID()}`,
      };
    }

    const session = await this.stripe.checkout.sessions.create({
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
      throw new Error('Stripe failed to return a checkout session URL.');
    }

    return {
      url: session.url,
      sessionId: session.id,
    };
  }

  async createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<{ url: string }> {
    log.info({ stripeCustomerId }, 'Creating Stripe customer portal session');

    if (this.isMockMode()) {
      log.info({}, 'Executing mock Stripe customer portal session creation');
      return {
        url: returnUrl,
      };
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  }

  async constructWebhookEvent(rawBody: string, signature: string, secret: string): Promise<BillingEvent> {
    log.info({}, 'Verifying Stripe webhook event signature');

    if (this.isMockMode()) {
      log.info({}, 'Executing mock Stripe webhook event verification');
      try {
        const parsed = JSON.parse(rawBody);
        return this.mapStripeEventToBillingEvent(parsed);
      } catch (err: any) {
        throw new Error(`Failed to parse mock webhook body: ${err.message}`);
      }
    }

    const event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
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
