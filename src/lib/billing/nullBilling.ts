import { BillingProvider, CheckoutSessionParams, BillingEvent } from './provider';
import { ApiError } from '@/lib/errors';
import log from '@/lib/logger';

export class NullBillingProvider implements BillingProvider {
  async createCheckoutSession(_params: CheckoutSessionParams): Promise<{ url: string; sessionId: string }> {
    log.warn({}, 'Attempted checkout session creation without an active payment gateway configured.');
    throw new ApiError(
      400,
      'PAYMENT_GATEWAY_NOT_CONFIGURED',
      'Payment portal is currently disabled. No payment gateway (Stripe/Razorpay/PayPal) is configured.'
    );
  }

  async createPortalSession(_stripeCustomerId: string, _returnUrl: string): Promise<{ url: string }> {
    log.warn({}, 'Attempted customer portal session creation without an active payment gateway configured.');
    throw new ApiError(
      400,
      'PAYMENT_GATEWAY_NOT_CONFIGURED',
      'Billing portal management is currently disabled because no payment gateway is configured.'
    );
  }

  async constructWebhookEvent(_rawBody: string, _signature: string, _secret: string): Promise<BillingEvent> {
    log.warn({}, 'Attempted webhook event verification without an active payment gateway configured.');
    throw new ApiError(
      400,
      'PAYMENT_GATEWAY_NOT_CONFIGURED',
      'Webhook processing disabled because no payment gateway is configured.'
    );
  }
}
