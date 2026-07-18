import { test, expect } from '@playwright/test';

test.describe('Authentication & Route Protection E2E Tests', () => {
  
  test('should redirect unauthenticated/anonymous users trying to access protected paths back to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect users accessing /login while authenticated back to dashboard', async ({ page, context }) => {
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

    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should prevent non-admin accounts from loading routes under /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login|dashboard/);
  });

  test('should display visual validation errors on invalid registration inputs', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="email"]', 'weak-email');
    await page.fill('input[name="password"]', '123');
    
    await page.click('button[type="submit"]');

    const emailError = page.locator('text=Must be a valid email address');
    const passError = page.locator('text=Password must be at least 8 characters long');
    
    await expect(emailError).toBeVisible();
    await expect(passError).toBeVisible();
  });

  test.describe('Password Reset E2E flows', () => {
    test('should show validation messages on weak password reset configurations', async ({ page }) => {
      // Go to reset password page (simulating valid link token redirect)
      await page.goto('/reset-password');

      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak-mismatch');

      await page.click('button[type="submit"]');

      const passError = page.locator('text=Password must be at least 8 characters long');
      const confirmError = page.locator('text=Passwords do not match');

      await expect(passError).toBeVisible();
      await expect(confirmError).toBeVisible();
    });

    test('should allow submission of forgot-password email requests', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[name="email"]', 'user@example.com');
      await page.click('button[type="submit"]');

      // Generic success notification or dialog should display
      const successNotice = page.locator('text=reset link has been sent');
      await expect(successNotice).toBeVisible();
    });
  });
});
