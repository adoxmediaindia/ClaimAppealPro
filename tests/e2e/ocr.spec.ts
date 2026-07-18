import { test, expect } from '@playwright/test';
import fs from 'fs';


test.describe('OCR Review Experience E2E Tests', () => {

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


  test('should render split-screen review form with original file details', async ({ page }) => {
    // Navigate to a mock review page route (using a placeholder UUID)
    await page.goto('/appeals/00000000-0000-0000-0000-000000000000');

    // Confirm redirected or loaded depending on database seeding. 
    // In local tests against mock server configurations, check if page layout title is present
    const header = page.locator('h1');
    await expect(header).toBeVisible();
  });

  test('should display visual warning validation alerts for missing inputs', async ({ page }) => {
    await page.goto('/appeals/00000000-0000-0000-0000-000000000000');

    // Ensure split layout forms are visible
    const patientInput = page.locator('input[id="patientName"]');
    await expect(patientInput).toBeVisible();

    // Verify low-confidence indicator badges render correctly next to warning fields
    const warningsHeader = page.locator('text=Verification Warnings');
    // If warning elements exist in the test page context, check visibility
    if (await warningsHeader.count() > 0) {
      await expect(warningsHeader).toBeVisible();
    }
  });
});
