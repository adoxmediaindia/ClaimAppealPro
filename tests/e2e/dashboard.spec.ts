import { test, expect } from '@playwright/test';

test.describe('Dashboard & Application Shell E2E tests', () => {

  test.beforeEach(async ({ context }) => {
    // Add authenticated mock session cookie
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-valid-jwt',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      }
    ]);
  });

  test('should render active metrics cards and layout frames', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Validate welcome message header
    await expect(page.locator('h1')).toContainText('Welcome back');

    // Validate metrics cards
    const cards = page.locator('.border-zinc-800');
    await expect(cards).toHaveCount(4); // 3 metric cards + 1 quick actions or appeals card
  });

  test('should support routing clicks inside the sidebar shell', async ({ page }) => {
    await page.goto('/dashboard');

    // Click on Appeals navigation link
    await page.click('text=Appeals');
    await expect(page).toHaveURL(/\/appeals/);

    // Click on Billing navigation link
    await page.click('text=Billing');
    await expect(page).toHaveURL(/\/billing/);

    // Click on Settings navigation link
    await page.click('text=Settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('should toggle command search palette via Ctrl+K hotkey combo', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify command palette is initially hidden
    const palette = page.locator('input[placeholder*="Type a command"]');
    await expect(palette).not.toBeVisible();

    // Trigger Cmd+K / Ctrl+K keyboard shortcut
    await page.waitForTimeout(2000); // Wait for React event hydration
    await page.keyboard.press('Control+k');

    // Verify command palette opens successfully
    await expect(palette).toBeVisible();
  });
});
