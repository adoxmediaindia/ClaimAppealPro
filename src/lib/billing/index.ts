import { BillingProvider } from './provider';
import { StripeBillingProvider } from './stripe';
import { NullBillingProvider } from './nullBilling';

export * from './provider';
export * from './plans';

export const getBillingProvider = (): BillingProvider => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (stripeKey && stripeKey.trim() !== '' && !stripeKey.includes('your-stripe-key')) {
    return new StripeBillingProvider();
  }

  return new NullBillingProvider();
};

export default getBillingProvider;
