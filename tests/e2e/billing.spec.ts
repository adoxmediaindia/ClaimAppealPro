import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Stripe Billing & Subscriptions E2E Tests', () => {
  const stateFilePath = 'C:\\Users\\prati\\.gemini\\antigravity\\brain\\99ddbc12-2335-4f25-804f-324c844e6864\\scratch\\mock_db_state.json';

  test.beforeEach(async ({ context }) => {
    // Reset file-persisted mock database status to default with active free tier
    const seededState = {
      appeal: null,
      subscription: {
        id: 'mock-sub-id',
        userId: 'mock-uuid',
        stripeCustomerId: 'cus_mock-customer-id',
        stripeSubscriptionId: 'sub_mock-subscription-id',
        planId: 'free',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      },
      payments: [],
    };

    fs.writeFileSync(stateFilePath, JSON.stringify(seededState, null, 2), 'utf-8');

    // Inject authenticated mock token cookie
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-valid-jwt',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('should render billing dashboard with active free tier and plans info', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForTimeout(2000); // Wait for React event hydration

    // Verify Active Plan Details card renders free trial details
    const activeBadge = page.locator('text=Free Tier');
    await expect(activeBadge).toBeVisible();

    const planHeader = page.locator('h4:has-text("Starter Free Trial")');
    await expect(planHeader).toBeVisible();

    // Verify Pro features are listed
    const proFeature = page.locator('text=Advanced PDF & OCR extraction pipeline');
    await expect(proFeature).toBeVisible();

    // Verify empty state invoice history table
    const noInvoice = page.locator('text=No payments processed.');
    await expect(noInvoice).toBeVisible();
  });

  test('should simulate upgrading to Pro and processing webhook completions', async ({ page, request }) => {
    await page.goto('/billing');
    await page.waitForTimeout(2000); // Wait for React event hydration

    // Verify Upgrade button works and redirects (mock checkout triggers immediate return)
    const upgradeButton = page.locator('button:has-text("Upgrade to Pro")');
    await expect(upgradeButton).toBeVisible();
    await upgradeButton.click();

    // Wait for mock checkout session URL routing
    await page.waitForURL(/session_id=mock_session_/);

    // Simulate Stripe payment success webhook post event
    const webhookResponse = await request.post('http://localhost:3000/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 'mock-webhook-signature',
      },
      data: {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_mock-customer-id',
            subscription: 'sub_mock-subscription-id',
            amount_total: 4900,
            currency: 'usd',
            metadata: {
              userId: 'mock-uuid',
            },
          },
        },
      },
    });

    expect(webhookResponse.ok()).toBeTruthy();

    // Navigate back to billing area and confirm Pro plan is now active
    await page.goto('/billing');
    await page.waitForTimeout(2000); // Wait for React event hydration

    const proBadge = page.locator('text=Pro Active');
    await expect(proBadge).toBeVisible();

    const proHeader = page.locator('h4:has-text("Professional Pro")');
    await expect(proHeader).toBeVisible();

    // Verify invoice history table now lists the payment
    const amountCell = page.locator('td:has-text("$49.00 USD")').first();
    await expect(amountCell).toBeVisible();

    const refCell = page.locator('td:has-text("checkout_sub_mock-subscription-id")');
    await expect(refCell).toBeVisible();
  });
});
