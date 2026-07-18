import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('PDF Print & Export E2E Tests', () => {

  test.beforeEach(async ({ context }) => {
    // Write dynamic mock state to state file with GENERATED status and appeal version seeded
    const stateFilePath = 'C:\\Users\\prati\\.gemini\\antigravity\\brain\\99ddbc12-2335-4f25-804f-324c844e6864\\scratch\\mock_db_state.json';
    
    const seededState = {
      appeal: {
        id: '00000000-0000-0000-0000-000000000000',
        userId: 'mock-uuid',
        status: 'GENERATED',
        createdAt: new Date().toISOString(),
        filePath: 'mock-file.pdf',
        originalName: 'denial.pdf',
        extractedMetadata: {
          patientName: { value: 'John Doe', confidence: 0.95 },
          insuranceCompany: { value: 'Aetna', confidence: 0.95 },
          claimNumber: { value: 'CLM12345', confidence: 0.95 },
          memberId: { value: 'MEM12345', confidence: 0.95 },
          policyNumber: { value: 'POL12345', confidence: 0.95 },
          dateOfService: { value: '2026-05-10', confidence: 0.95 },
          denialDate: { value: '2026-05-12', confidence: 0.95 },
          providerName: { value: 'Dr. John Smith', confidence: 0.95 },
          cptCodes: { value: ['99214'], confidence: 0.95 },
          icdCodes: { value: ['I10'], confidence: 0.95 },
          denialReason: { value: 'Not medically necessary', confidence: 0.95 },
          appealDeadline: { value: '2026-11-12', confidence: 0.95 },
          contactInformation: { value: '1-800-555-0199', confidence: 0.95 },
          address: { value: 'P.O. Box 1234, Hartford, CT', confidence: 0.95 },
        },
        structuredInput: {
          patientName: { value: 'John Doe', confidence: 0.95 },
          insuranceCompany: { value: 'Aetna', confidence: 0.95 },
          claimNumber: { value: 'CLM12345', confidence: 0.95 },
          memberId: { value: 'MEM12345', confidence: 0.95 },
          policyNumber: { value: 'POL12345', confidence: 0.95 },
          dateOfService: { value: '2026-05-10', confidence: 0.95 },
          denialDate: { value: '2026-05-12', confidence: 0.95 },
          providerName: { value: 'Dr. John Smith', confidence: 0.95 },
          cptCodes: { value: ['99214'], confidence: 0.95 },
          icdCodes: { value: ['I10'], confidence: 0.95 },
          denialReason: { value: 'Not medically necessary', confidence: 0.95 },
          appealDeadline: { value: '2026-11-12', confidence: 0.95 },
          contactInformation: { value: '1-800-555-0199', confidence: 0.95 },
          address: { value: 'P.O. Box 1234, Hartford, CT', confidence: 0.95 },
        },
        files: [
          {
            id: 'mock-file-id',
            fileName: 'denial.pdf',
            storagePath: 'appeals/mock-file.pdf',
          }
        ],
        versions: [
          {
            id: 'v1-id',
            appealId: '00000000-0000-0000-0000-000000000000',
            versionNumber: 1,
            letterContent: 'EXECUTIVE SUMMARY\nThis is a clinical appeal letter body.\nDr. John Smith signature.',
            createdAt: new Date().toISOString(),
          }
        ],
        aiGenerations: [
          {
            id: 'gen1-id',
            appealId: '00000000-0000-0000-0000-000000000000',
            promptTokens: 100,
            completionTokens: 200,
            totalTokens: 300,
            cost: 0.002,
            modelUsed: 'gpt-4o',
            promptTemplateUsed: 'v1.0',
            createdAt: new Date().toISOString(),
          }
        ],
        pdfExports: [],
      }
    };

    fs.writeFileSync(stateFilePath, JSON.stringify(seededState, null, 2), 'utf-8');

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

  test('should verify template selections, generate PDF export, show preview iframe, and list archive records', async ({ page }) => {
    // 1. Navigate to the appeal page (status: GENERATED)
    await page.goto('/appeals/00000000-0000-0000-0000-000000000000');

    // Verify appeal letter draft is displayed
    const draftHeader = page.locator('text=Generated Appeal Letter');
    await expect(draftHeader).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(2000); // Wait for React hydration to attach event listeners

    // 2. Setup selections
    const templateSelect = page.locator('#templateSelect');
    await expect(templateSelect).toBeVisible({ timeout: 25000 });
    await templateSelect.selectOption({ value: 'professional' });
    await expect(templateSelect).toHaveValue('professional');

    const pageSizeSelect = page.locator('#pageSizeSelect');
    await expect(pageSizeSelect).toBeVisible({ timeout: 15000 });
    await pageSizeSelect.selectOption({ value: 'a4' });
    await expect(pageSizeSelect).toHaveValue('a4');

    // 3. Trigger generation
    const generateBtn = page.locator('#generatePdfButton');
    await expect(generateBtn).toBeVisible({ timeout: 15000 });
    await generateBtn.click();

    // Verify preview frame loads successfully
    const previewIframe = page.locator('#pdfPreviewIframe');
    await expect(previewIframe).toBeVisible({ timeout: 25000 });

    // Verify version list updates showing PDF Export (AI v#1)
    const exportRecord = page.locator('text=Template: professional (a4)').first();
    await expect(exportRecord).toBeVisible({ timeout: 15000 });
  });

});
