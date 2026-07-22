import { BillingProvider } from './provider';
import { PaddleBillingProvider } from './paddle';
import { NullBillingProvider } from './nullBilling';

export * from './provider';
export * from './plans';

export const getBillingProvider = (): BillingProvider => {
  const paddleKey = process.env.PADDLE_API_KEY;
  const isTest = process.env.NODE_ENV === 'test';

  if (isTest || (paddleKey && paddleKey.trim() !== '' && !paddleKey.includes('your-paddle-key'))) {
    return new PaddleBillingProvider();
  }

  return new NullBillingProvider();
};

export default getBillingProvider;
