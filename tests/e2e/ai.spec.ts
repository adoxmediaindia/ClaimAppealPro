import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('AI Appeal Generation & Versioning E2E Tests', () => {

  test.beforeEach(async ({ context }) => {
    // Reset file-based mock DB state to default READY status
    const stateFilePath = 'C:\\Users\\prati\\.gemini\\antigravity\\brain\\99ddbc12-2335-4f25-804f-324c844e6864\\scratch\\mock_db_state.json';
    if (fs.existsSync(stateFilePath)) {
      try {
        fs.unlinkSync(stateFilePath);
      } catch (err) {
        // Ignore unlink error
      }
    }

    // Inject authenticated mock token cookie
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

  test('should verify full review form submission, AI draft generation, and roll-forward rollbacks', async ({ page }) => {
    // 1. Navigate to the appeal review route (status: READY)
    await page.goto('/appeals/00000000-0000-0000-0000-000000000000');

    // Verify Review Form is visible
    const patientInput = page.locator('input[id="patientName"]');
    await expect(patientInput).toBeVisible();
    await page.waitForTimeout(2000); // Wait for React hydration to attach event listeners

    // 2. Submit form ("Verify & Proceed") which saves and auto-generates the letter
    const verifyButton = page.locator('button[type="submit"]');
    await expect(verifyButton).toBeVisible();
    await verifyButton.click();

    // Verify it redirects or reloads into the completed Draft view
    const draftHeader = page.locator('text=Draft Completed');
    await expect(draftHeader).toBeVisible({ timeout: 15000 });

    // Verify generated letter text block is visible
    const letterText = page.locator('text=EXECUTIVE SUMMARY');
    await expect(letterText).toBeVisible();

    // Verify Version history lists Version 1
    const v1Indicator = page.locator('text=Draft Version #1');
    await expect(v1Indicator).toBeVisible();

    // 3. Trigger appeal letter regeneration
    const regenerateBtn = page.locator('button:has-text("Regenerate Letter")');
    await expect(regenerateBtn).toBeVisible();
    await regenerateBtn.click();

    // Verify version list now shows Version 2
    const v2Indicator = page.locator('text=Draft Version #2');
    await expect(v2Indicator).toBeVisible({ timeout: 10000 });

    // 4. Trigger roll-forward rollback to Version 1
    const restoreBtn = page.locator('button:has-text("Restore")').first();
    await expect(restoreBtn).toBeVisible();
    await restoreBtn.click();

    // Verify list updates showing Version 3 (created by roll-forward rollback of Version 1)
    const v3Indicator = page.locator('text=Draft Version #3');
    await expect(v3Indicator).toBeVisible({ timeout: 10000 });
  });

});
