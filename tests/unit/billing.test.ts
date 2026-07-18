import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlanById, getPlanByPriceId } from '@/lib/billing/plans';
import { createCheckoutSessionAction, createCustomerPortalAction, fetchInvoiceHistoryAction } from '@/app/actions/billing';
import { processOcrForFile } from '@/app/actions/ocr';
import { generateAppealAction } from '@/app/actions/ai';
import { POST } from '@/app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';

// 1. Setup hoisted mocks
const hoisted = vi.hoisted(() => {
  const mockUserFindUnique = vi.fn();
  const mockSubFindUnique = vi.fn();
  const mockSubUpsert = vi.fn();
  const mockSubUpdate = vi.fn();
  const mockPaymentCreate = vi.fn();
  const mockPaymentFindMany = vi.fn();
  const mockAuditLogCreate = vi.fn();
  const mockFileFindUnique = vi.fn();
  const mockAppealFindUnique = vi.fn();

  const mockPrisma: any = {
    user: {
      findUnique: mockUserFindUnique,
    },
    subscription: {
      findUnique: mockSubFindUnique,
      upsert: mockSubUpsert,
      update: mockSubUpdate,
    },
    payment: {
      create: mockPaymentCreate,
      findMany: mockPaymentFindMany,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
    file: {
      findUnique: mockFileFindUnique,
    },
    appeal: {
      findUnique: mockAppealFindUnique,
    },
  };

  return {
    mockPrisma,
    mockUserFindUnique,
    mockSubFindUnique,
    mockSubUpsert,
    mockSubUpdate,
    mockPaymentCreate,
    mockPaymentFindMany,
    mockAuditLogCreate,
    mockFileFindUnique,
    mockAppealFindUnique,
  };
});

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  createServerSideClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock('@/lib/prisma', () => ({
  default: hoisted.mockPrisma,
  prisma: hoisted.mockPrisma,
}));

describe('Billing & Subscription System Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock-stripe-secret-key';
    process.env.STRIPE_WEBHOOK_SECRET = 'mock-stripe-webhook';
  });

  describe('Plans Configuration Mapping', () => {
    it('should load dynamic limits based on planId', () => {
      const freePlan = getPlanById('free');
      expect(freePlan.limit).toBe(5);
      expect(freePlan.name).toContain('Starter');

      const proPlan = getPlanById('pro');
      expect(proPlan.limit).toBe(100);
      expect(proPlan.name).toContain('Professional');

      // Fallback
      const unknownPlan = getPlanById('invalid');
      expect(unknownPlan.limit).toBe(5);
    });

    it('should map priceId to corresponding plan configuration', () => {
      const proPlan = getPlanByPriceId('price_pro_subscription');
      expect(proPlan.planId).toBe('pro');

      const freePlan = getPlanByPriceId('');
      expect(freePlan.planId).toBe('free');
    });
  });

  describe('Billing Server Actions', () => {
    it('should execute checkout session action successfully generating redirects', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-uuid', email: 'billing@example.com' } },
        error: null,
      });

      hoisted.mockSubFindUnique.mockResolvedValue(null);
      hoisted.mockAuditLogCreate.mockResolvedValue({ id: 'log-uuid' });

      const res = await createCheckoutSessionAction('price_pro_subscription');
      expect(res.success).toBe(true);
      expect(res.data?.url).toContain('session_id=mock_session_');
      expect(hoisted.mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'BILLING_CHECKOUT_INITIATED',
          }),
        })
      );
    });

    it('should block checkout initiation if Pro plan is already active', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-uuid', email: 'billing@example.com' } },
        error: null,
      });

      hoisted.mockSubFindUnique.mockResolvedValue({
        planId: 'pro',
        status: 'active',
      });

      const res = await createCheckoutSessionAction('price_pro_subscription');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('ACTIVE_SUBSCRIPTION_EXISTS');
    });

    it('should generate portal redirection link if active stripe customer exists', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
        error: null,
      });

      hoisted.mockSubFindUnique.mockResolvedValue({
        stripeCustomerId: 'cus_test-customer',
        stripeSubscriptionId: 'sub_test',
        status: 'active',
      });

      const res = await createCustomerPortalAction();
      expect(res.success).toBe(true);
      expect(res.data?.url).toContain('billing');
      expect(hoisted.mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'BILLING_PORTAL_OPENED',
          }),
        })
      );
    });

    it('should reject portal redirect request if customer profile has no active billing ID', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
        error: null,
      });

      hoisted.mockSubFindUnique.mockResolvedValue(null);

      const res = await createCustomerPortalAction();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NO_BILLING_CUSTOMER');
    });

    it('should fetch invoices list for current user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
        error: null,
      });

      const mockPayments = [
        { id: 'pay-1', amount: 4900, status: 'completed', currency: 'usd' },
      ];
      hoisted.mockPaymentFindMany.mockResolvedValue(mockPayments);

      const res = await fetchInvoiceHistoryAction();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0].amount).toBe(4900);
    });
  });

  describe('Stripe Webhook Event Handlers', () => {
    it('should process checkout completed events updating subscription status', async () => {
      const payload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test-customer',
            subscription: 'sub_test-subscription',
            amount_total: 4900,
            currency: 'usd',
            metadata: {
              userId: 'user-uuid',
            },
          },
        },
      };

      const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'mock-sig' },
        body: JSON.stringify(payload),
      });

      hoisted.mockSubUpsert.mockResolvedValue({ id: 'sub-uuid' });
      hoisted.mockPaymentCreate.mockResolvedValue({ id: 'pay-uuid' });

      const response = await POST(req);
      expect(response.status).toBe(200);

      expect(hoisted.mockSubUpsert).toHaveBeenCalled();
      expect(hoisted.mockPaymentCreate).toHaveBeenCalled();
      expect(hoisted.mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'STRIPE_CHECKOUT_COMPLETED',
          }),
        })
      );
    });

    it('should process invoice paid events writing payment logs', async () => {
      const payload = {
        type: 'invoice.paid',
        data: {
          object: {
            customer: 'cus_test-customer',
            subscription: 'sub_test-subscription',
            amount_paid: 4900,
            currency: 'usd',
          },
        },
      };

      const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'mock-sig' },
        body: JSON.stringify(payload),
      });

      hoisted.mockSubFindUnique.mockResolvedValue({ userId: 'user-uuid' });

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(hoisted.mockPaymentCreate).toHaveBeenCalled();
    });

    it('should process subscription deleted event downgrading subscription to free', async () => {
      const payload = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_test-customer',
            id: 'sub_test-subscription',
            status: 'canceled',
          },
        },
      };

      const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'mock-sig' },
        body: JSON.stringify(payload),
      });

      hoisted.mockSubFindUnique.mockResolvedValue({ userId: 'user-uuid' });

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(hoisted.mockSubUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            planId: 'free',
            status: 'canceled',
          }),
        })
      );
    });
  });

  describe('Quota Limits Enforcement', () => {
    it('should reject file OCR actions when usage limit is exceeded', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
        error: null,
      });

      hoisted.mockUserFindUnique.mockResolvedValue({
        subscription: { planId: 'free', status: 'active' },
        _count: { appeals: 5 }, // 5 generated out of 5 limit
      });

      const res = await processOcrForFile('file-uuid');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('QUOTA_EXCEEDED');
    });

    it('should reject AI generations when limit is exceeded', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-uuid' } },
        error: null,
      });

      hoisted.mockUserFindUnique.mockResolvedValue({
        subscription: { planId: 'free', status: 'active' },
        _count: { appeals: 5 },
      });

      const res = await generateAppealAction('appeal-uuid');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('QUOTA_EXCEEDED');
    });
  });
});
