import { BillingProvider } from './provider';
import { StripeBillingProvider } from './stripe';

let activeProvider: BillingProvider | null = null;

export const getBillingProvider = (): BillingProvider => {
  if (!activeProvider) {
    activeProvider = new StripeBillingProvider();
  }
  return activeProvider;
};

export default getBillingProvider;
