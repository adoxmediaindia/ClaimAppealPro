import { test, expect } from '@playwright/test';

test.describe('Document Upload System E2E Tests', () => {

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

  test('should render secure file upload dropzone and layout guides', async ({ page }) => {
    await page.goto('/appeals/new');
    
    // Check main title text
    await expect(page.locator('h1')).toContainText('Upload Denial Document');

    // Confirm presence of drag-and-drop zone
    const dropzone = page.locator('text=Drag & drop files here');
    await expect(dropzone).toBeVisible();
  });

  test('should reject invalid file extensions visually', async ({ page }) => {
    await page.goto('/appeals/new');

    // Set file input values directly to trigger upload simulation
    // Playwright allows setting input files even on hidden inputs
    const input = page.locator('input[type="file"]');
    
    // Upload a mock text file (invalid format)
    await input.setInputFiles({
      name: 'malicious.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('unsupported format text content'),
    });

    // Verify error badge and warning message appear in the upload queue
    const warning = page.locator('text=Only PDF, JPG, and PNG files are accepted');
    await expect(warning).toBeVisible();
  });

  test('should reject files exceeding 10MB size limit visually', async ({ page }) => {
    await page.goto('/appeals/new');

    const input = page.locator('input[type="file"]');
    
    // Upload a mock large file (12MB)
    await input.setInputFiles({
      name: 'too_large.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(12 * 1024 * 1024), // 12MB buffer
    });

    // Verify error badge and warning message appear
    const warning = page.locator('text=File size must not exceed 10MB');
    await expect(warning).toBeVisible();
  });
});
