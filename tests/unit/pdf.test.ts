import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHtmlTemplate, RenderParams } from '@/lib/pdf/renderer';
import { PuppeteerPdfProvider } from '@/lib/pdf/puppeteer';
import { generatePdfExportAction } from '@/app/actions/pdf';
import { prisma } from '@/lib/prisma';

// Mock puppeteer package to force offline/sandbox mock generation fallback immediately
vi.mock('puppeteer', () => {
  return {
    default: {
      launch: vi.fn().mockRejectedValue(new Error('Mock browser launch failure for unit tests')),
    },
    launch: vi.fn().mockRejectedValue(new Error('Mock browser launch failure for unit tests')),
  };
});


// Mock storage provider
vi.mock('@/lib/storage', () => {
  return {
    SupabaseStorageProvider: class {
      uploadFile = vi.fn().mockResolvedValue(undefined);
      generateDownloadUrl = vi.fn().mockResolvedValue('https://mock-supabase.co/signed-pdf-url');
      downloadFile = vi.fn().mockResolvedValue(Buffer.from(''));
      deleteFile = vi.fn().mockResolvedValue(undefined);
    }
  };
});


// Mock Supabase Auth
vi.mock('@/lib/supabase', () => {
  return {
    createServerSideClient: vi.fn().mockImplementation(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'mock-uuid', email: 'user@example.com' } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed-url' }, error: null }),
      },
    })),
  };
});

describe('PDF Generation & Rendering Engine Unit Tests', () => {
  const sampleParams: RenderParams = {
    patientName: 'John Doe',
    insuranceCompany: 'Aetna',
    claimNumber: 'CLM12345',
    memberId: 'MEM12345',
    policyNumber: 'POL12345',
    dateOfService: '2026-05-10',
    denialDate: '2026-05-12',
    providerName: 'Dr. John Smith',
    cptCodes: ['99214'],
    icdCodes: ['I10'],
    denialReason: 'Not medically necessary',
    appealDeadline: '2026-11-12',
    contactInformation: '1-800-555-0199',
    address: 'P.O. Box 1234, Hartford, CT',
    letterContent: 'This is a mock clinical appeal letter content block.\nSection 1: Medical necessity is demonstrated.',
  };

  describe('Document HTML Renderer & Templates', () => {
    it('should correctly render Default Template matching typography standards', () => {
      const html = renderHtmlTemplate(sampleParams, 'default');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('John Doe');
      expect(html).toContain('style="margin-bottom: 1.5em; line-height: 1.65;"');
      expect(html).toContain('Inter, -apple-system');
    });

    it('should correctly render Professional Template serif stacks', () => {
      const html = renderHtmlTemplate(sampleParams, 'professional');
      expect(html).toContain('Times, serif');
      expect(html).toContain('CLM12345');
      expect(html).toContain('99214');
    });
  });

  describe('PDF Provider & Fallback Framework', () => {
    it('should execute Puppeteer launch fallback cleanly returning structured PDF buffer', async () => {
      const provider = new PuppeteerPdfProvider();
      const result = await provider.generate('<html>Content</html>', { size: 'letter' });
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.pdfBuffer.toString().substring(0, 4)).toBe('%PDF'); // Starts with PDF magic bytes
    });
  });

  describe('Server Actions & BOLA Gates', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should execute PDF export action generating database records and audit trails', async () => {
      // Seed a version record in the mock state
      const { getMockState, saveMockState } = await import('@/lib/prisma');
      const mockState = getMockState();
      if (!mockState.appeal) {
        mockState.appeal = {
          id: '00000000-0000-0000-0000-000000000000',
          userId: 'mock-uuid',
          status: 'READY',
          createdAt: new Date().toISOString(),
          filePath: 'mock-file.pdf',
          originalName: 'denial.pdf',
          versions: [],
          aiGenerations: [],
          pdfExports: [],
        };
      }
      mockState.appeal.versions = [
        {
          id: 'v1-id',
          appealId: mockState.appeal.id,
          versionNumber: 1,
          letterContent: 'Sample appeal text',
          createdAt: new Date().toISOString(),
        },
      ];
      mockState.appeal.status = 'READY';
      saveMockState(mockState);


      const res = await generatePdfExportAction(mockState.appeal.id, 1, 'default', 'letter');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data.templateName).toBe('default');
      expect(res.data.pageSize).toBe('letter');

      // Verify parent status updated to EXPORTED
      const updatedAppeal = await prisma.appeal.findUnique({
        where: { id: mockState.appeal.id },
      });
      expect(updatedAppeal?.status).toBe('EXPORTED');
    });

    it('should block PDF generation if the user is unauthenticated or does not own the appeal', async () => {
      const supabaseMock = await import('@/lib/supabase');
      // Force unauthenticated user mock
      vi.mocked(supabaseMock.createServerSideClient).mockImplementationOnce(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Session expired'),
          }),
        },
      }) as any);

      const res = await generatePdfExportAction('some-appeal-id', 1, 'default');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('UNAUTHORIZED');
    });
  });
});
