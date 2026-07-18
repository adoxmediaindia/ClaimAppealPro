import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Enterprise Admin Dashboard & Operations E2E Tests', () => {
  // Fallback to local appData path if Temp path is not matching prisma.ts
  const actualStateFilePath = 'C:\\Users\\prati\\.gemini\\antigravity\\brain\\99ddbc12-2335-4f25-804f-324c844e6864\\scratch\\mock_db_state.json';

  test.beforeEach(() => {
    // Re-seed mock database state with administrative users and configs
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
      payments: [
        { id: 'pay-1', amount: 4900, currency: 'usd', createdAt: new Date().toISOString() }
      ],
      users: [
        {
          id: 'mock-uuid',
          email: 'user@example.com',
          role: 'USER',
          createdAt: new Date().toISOString(),
          profile: { firstName: 'Valued', lastName: 'Provider', clinicName: 'Standard Clinic' },
          subscription: { planId: 'free', status: 'active' },
        },
        {
          id: 'mock-admin-uuid',
          email: 'admin@example.com',
          role: 'ADMIN',
          createdAt: new Date().toISOString(),
          profile: { firstName: 'Clinic', lastName: 'Admin', clinicName: 'HQ Operations' },
          subscription: null,
        }
      ],
      auditLogs: [] as any[],
      featureFlags: [
        { id: 'flag-1', key: 'OCR_FALLBACK_ENABLED', value: true, description: 'Bypasses Mistral failures to Tesseract local client.' },
        { id: 'flag-2', key: 'AI_TEMPLATE_RETRY_ENABLED', value: true, description: 'Retries OpenAI completion requests upon timeout errors.' },
      ],
    };

    fs.writeFileSync(actualStateFilePath, JSON.stringify(seededState, null, 2), 'utf-8');
  });

  test('should redirect non-admin accounts to dashboard area', async ({ page, context }) => {
    // Inject standard USER role cookie token
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-valid-jwt',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/admin');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should load administrative dashboard when authenticated as ADMIN', async ({ page, context }) => {
    // Inject ADMIN role cookie token
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-admin-jwt',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/admin');
    await page.waitForTimeout(2000); // Wait for React event hydration

    // Verify Title and Admin header render correctly
    const heading = page.locator('h1:has-text("System Administration")');
    await expect(heading).toBeVisible();

    // Verify system statistics cards render
    const usersCard = page.locator('text=Total Tenants');
    await expect(usersCard).toBeVisible();

    const revenueCard = page.locator('text=Total Payments');
    await expect(revenueCard).toBeVisible();
    const amountText = page.locator('text=$49.00');
    await expect(amountText).toBeVisible();

    // Verify tab changes to Users & Plans
    const usersTab = page.locator('button:has-text("Users & Plans")');
    await usersTab.click();
    await page.waitForTimeout(500);

    const userEmailRow = page.locator('td:has-text("user@example.com")');
    await expect(userEmailRow).toBeVisible();

    const adminEmailRow = page.locator('td:has-text("admin@example.com")');
    await expect(adminEmailRow).toBeVisible();

    // Verify tab changes to Feature Flags
    const flagsTab = page.locator('button:has-text("Feature Flags")');
    await flagsTab.click();
    await page.waitForTimeout(500);

    const flagTitle = page.locator('text=OCR_FALLBACK_ENABLED');
    await expect(flagTitle).toBeVisible();

    // Toggle Flag and check transition
    const disableButton = page.locator('button:has-text("Disable")').first();
    await disableButton.click();
    await page.waitForTimeout(1000);

    // Verify tab changes to Audit Logs
    const auditsTab = page.locator('button:has-text("Audit Logs")');
    await auditsTab.click();
    await page.waitForTimeout(500);

    const auditActionCode = page.locator('text=ADMIN_FEATURE_FLAG_TOGGLED');
    await expect(auditActionCode).toBeVisible();

    // Verify tab changes to System Health
    const healthTab = page.locator('button:has-text("System Health")');
    await healthTab.click();
    await page.waitForTimeout(500);

    const dbHealth = page.locator('text=ONLINE').first();
    await expect(dbHealth).toBeVisible();
  });
});
