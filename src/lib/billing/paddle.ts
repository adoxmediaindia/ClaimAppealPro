import { BillingProvider, CheckoutSessionParams, BillingEvent } from './provider';
import log from '@/lib/logger';
import { ApiError } from '@/lib/errors';
import crypto from 'crypto';

export class PaddleBillingProvider implements BillingProvider {
  private endpoint = process.env.PADDLE_ENV === 'production' 
    ? 'https://api.paddle.com' 
    : 'https://sandbox-api.paddle.com';

  private isMockMode(): boolean {
    const key = process.env.PADDLE_API_KEY || '';
    return (
      process.env.NODE_ENV === 'test' ||
      key === '' ||
      key.includes('mock') ||
      key.includes('your-paddle-key')
    );
  }

  private getApiKey(): string {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey || apiKey.includes('your-paddle-key')) {
      throw new ApiError(400, 'PADDLE_KEY_MISSING', 'Paddle API Key is not configured.');
    }
    return apiKey;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string; sessionId: string }> {
    log.info({ userId: params.userId, email: params.email }, 'Creating Paddle checkout session');

    if (this.isMockMode()) {
      log.info({}, 'Executing mock Paddle checkout session creation');
      const mockSessionId = `mock_session_${crypto.randomUUID()}`;
      return {
        url: `${params.successUrl}?session_id=${mockSessionId}`,
        sessionId: mockSessionId,
      };
    }

    try {
      const apiKey = this.getApiKey();
      
      // Call Paddle Billing API to create a checkout transaction
      const response = await fetch(`${this.endpoint}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              price_id: params.priceId,
              quantity: 1,
            },
          ],
          custom_data: {
            userId: params.userId,
          },
          customer_email: params.email,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        log.error({ status: response.status, errText }, 'Paddle transaction creation failed');
        throw new ApiError(response.status, 'PADDLE_API_ERROR', `Paddle error: ${errText}`);
      }

      const data = await response.json();
      const checkoutUrl = data?.data?.details?.checkout?.url;
      const transactionId = data?.data?.id;

      if (!checkoutUrl) {
        // Fallback to Paddle sandbox hosted buy URL if transaction direct checkout URL is not present
        const fallbackUrl = process.env.PADDLE_ENV === 'production'
          ? `https://checkout.paddle.com/checkout/buy?price=${params.priceId}&customer_email=${encodeURIComponent(params.email)}&custom_data=${encodeURIComponent(JSON.stringify({ userId: params.userId }))}`
          : `https://sandbox-checkout.paddle.com/checkout/buy?price=${params.priceId}&customer_email=${encodeURIComponent(params.email)}&custom_data=${encodeURIComponent(JSON.stringify({ userId: params.userId }))}`;
        
        return {
          url: fallbackUrl,
          sessionId: transactionId || `fallback_${crypto.randomUUID()}`,
        };
      }

      return {
        url: checkoutUrl,
        sessionId: transactionId,
      };
    } catch (err: any) {
      log.error({ error: err.message }, 'Failed to initialize Paddle transaction');
      throw err;
    }
  }

  async createPortalSession(paddleCustomerId: string, returnUrl: string): Promise<{ url: string }> {
    log.info({ paddleCustomerId }, 'Creating Paddle customer portal session');

    if (this.isMockMode()) {
      log.info({}, 'Executing mock Paddle portal session redirect');
      return {
        url: returnUrl,
      };
    }

    try {
      const apiKey = this.getApiKey();
      
      // In Paddle, subscription management is handled using subscription management URLs.
      // We list the customer's active subscriptions to retrieve their management update_payment_method URL.
      const response = await fetch(`${this.endpoint}/subscriptions?customer_id=${paddleCustomerId}&status=active`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        log.error({ status: response.status, errText }, 'Failed to query active subscriptions in Paddle');
        throw new ApiError(response.status, 'PADDLE_API_ERROR', `Paddle error: ${errText}`);
      }

      const data = await response.json();
      const subscription = data?.data?.[0];
      const portalUrl = subscription?.management_urls?.update_payment_method || subscription?.management_urls?.cancel;

      if (!portalUrl) {
        return { url: returnUrl }; // Graceful fallback
      }

      return {
        url: portalUrl,
      };
    } catch (err: any) {
      log.error({ error: err.message }, 'Failed to query customer subscriptions');
      return { url: returnUrl };
    }
  }

  async constructWebhookEvent(rawBody: string, signature: string, secret: string): Promise<BillingEvent> {
    log.info({}, 'Verifying Paddle webhook signature');

    if (this.isMockMode()) {
      log.info({}, 'Executing mock Paddle webhook verification');
      try {
        const parsed = JSON.parse(rawBody);
        return this.mapPaddleEventToBillingEvent(parsed);
      } catch (err: any) {
        throw new Error(`Failed to parse mock webhook body: ${err.message}`);
      }
    }

    if (!secret) {
      throw new ApiError(400, 'PADDLE_WEBHOOK_SECRET_MISSING', 'Paddle webhook secret is not configured.');
    }

    // Verify signature header format: t=TIMESTAMP;h=SIGNATURE
    const parts = signature.split(';');
    const tPart = parts.find((p) => p.startsWith('t='));
    const hPart = parts.find((p) => p.startsWith('h='));

    if (!tPart || !hPart) {
      throw new ApiError(400, 'INVALID_SIGNATURE_HEADER', 'Paddle signature header format is invalid.');
    }

    const timestamp = tPart.split('=')[1];
    const hash = hPart.split('=')[1];

    const signedPayload = `${timestamp}:${rawBody}`;
    const calculatedHash = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    if (calculatedHash !== hash) {
      log.error({ hash, calculatedHash }, 'Paddle webhook signature mismatch');
      throw new ApiError(400, 'PADDLE_SIGNATURE_MISMATCH', 'Webhook signature verification failed.');
    }

    const event = JSON.parse(rawBody);
    return this.mapPaddleEventToBillingEvent(event);
  }

  private mapPaddleEventToBillingEvent(event: any): BillingEvent {
    const eventType = event.event_type;
    const data = event.data;

    if (!data) {
      return { type: 'unknown', customerId: '' };
    }

    // In Paddle, subscription prices, status, and metadata reside inside data.
    const customerId = data.customer_id || '';
    const subscriptionId = data.id || '';
    
    // Parse userId from custom data
    let metadata: Record<string, any> = {};
    if (data.custom_data) {
      metadata = data.custom_data;
    } else if (data.transaction?.custom_data) {
      metadata = data.transaction.custom_data;
    }

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.activated':
        return {
          type: 'checkout.completed',
          customerId,
          subscriptionId,
          amount: data.next_billing_period?.amount || 0,
          currency: data.currency_code || 'USD',
          metadata,
        };

      case 'subscription.updated':
        return {
          type: 'subscription.updated',
          customerId,
          subscriptionId,
          priceId: data.items?.[0]?.price?.id || '',
          status: data.status || 'active',
          currentPeriodStart: data.current_billing_period?.starts_at ? new Date(data.current_billing_period.starts_at) : new Date(),
          currentPeriodEnd: data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : new Date(),
          cancelAtPeriodEnd: data.scheduled_change?.action === 'cancel',
          metadata,
        };

      case 'subscription.canceled':
        return {
          type: 'subscription.deleted',
          customerId,
          subscriptionId,
          status: 'canceled',
        };

      case 'transaction.completed':
      case 'transaction.paid':
        return {
          type: 'invoice.paid',
          customerId,
          subscriptionId: data.subscription_id || '',
          amount: data.details?.totals?.grand_total || 0,
          currency: data.currency_code || 'USD',
        };

      default:
        // Generic mapping for other events
        return {
          type: 'unknown',
          customerId,
          subscriptionId,
        };
    }
  }
}
