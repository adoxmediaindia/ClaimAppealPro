export interface PricingPlan {
  planId: string;
  name: string;
  priceId: string;
  limit: number;
  priceAmount: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, PricingPlan> = {
  free: {
    planId: 'free',
    name: 'Starter Free Trial',
    priceId: '',
    limit: 5,
    priceAmount: 0,
    features: [
      '5 appeal letters generation monthly limit',
      'Standard PDF/OCR parsing',
      'Email support channels',
    ],
  },
  pro: {
    planId: 'pro',
    name: 'Professional Pro',
    priceId: 'price_pro_subscription',
    limit: 100,
    priceAmount: 49,
    features: [
      '100 appeal letters generation monthly allocation',
      'Advanced PDF & OCR extraction pipeline',
      'Version rollback and restore archives',
      'Priority email and phone support',
    ],
  },
  enterprise: {
    planId: 'enterprise',
    name: 'Enterprise Support',
    priceId: 'price_enterprise_subscription',
    limit: 999999,
    priceAmount: 199,
    features: [
      'Unlimited appeal letters generation',
      'Advanced document OCR cluster',
      'Collaborative team support',
      'Custom API endpoints & integrations',
      '24/7 Dedicated account manager support',
    ],
  },
};

export const getPlanById = (planId: string): PricingPlan => {
  return SUBSCRIPTION_PLANS[planId.toLowerCase()] || SUBSCRIPTION_PLANS.free;
};

export const getPlanByPriceId = (priceId: string): PricingPlan => {
  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.priceId === priceId) || SUBSCRIPTION_PLANS.free;
};
