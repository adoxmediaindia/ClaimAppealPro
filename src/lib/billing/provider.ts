export interface CheckoutSessionParams {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingEvent {
  type: 'checkout.completed' | 'invoice.paid' | 'subscription.updated' | 'subscription.deleted' | 'unknown';
  customerId: string;
  subscriptionId?: string;
  priceId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
}

export interface BillingProvider {
  createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string; sessionId: string }>;
  createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<{ url: string }>;
  constructWebhookEvent(rawBody: string, signature: string, secret: string): Promise<BillingEvent>;
}
