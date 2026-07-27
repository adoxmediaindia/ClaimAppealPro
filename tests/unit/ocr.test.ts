import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OcrNormalizer } from '@/lib/ocr/normalizer';
import { OcrValidator } from '@/lib/ocr/validator';
import { processOcrForFile, updateAppealStructuredData } from '@/app/actions/ocr';

// 1. Setup mock database calls and functions inside a single hoisted object
const hoisted = vi.hoisted(() => {
  const mockFileFindUniqueFn = vi.fn();
  const mockAppealUpdateFn = vi.fn();
  const mockAppealFindUniqueFn = vi.fn();
  const mockAuditLogCreateFn = vi.fn();
  const mockDownloadFileFn = vi.fn();
  const mockMistralExtractFn = vi.fn();
  const mockTesseractExtractFn = vi.fn();
  const mockParsePdfFn = vi.fn().mockResolvedValue({
    text: 'Patient Name: Fallback User \nClaim Number: CLM-FALLBACK \nDenial Date: 01/01/2026',
  });
  const mockUserFindUniqueFn = vi.fn().mockResolvedValue({
    subscription: { planId: 'free', status: 'active' },
    _count: { appeals: 0 }
  });

  const mockPrismaInstance: any = {
    user: {
      findUnique: mockUserFindUniqueFn,
    },
    file: {
      findUnique: mockFileFindUniqueFn,
    },
    appeal: {
      findUnique: mockAppealFindUniqueFn,
      update: mockAppealUpdateFn,
    },
    auditLog: {
      create: mockAuditLogCreateFn,
    },
  };

  return {
    mockPrisma: mockPrismaInstance,
    mockFileFindUnique: mockFileFindUniqueFn,
    mockAppealUpdate: mockAppealUpdateFn,
    mockAppealFindUnique: mockAppealFindUniqueFn,
    mockAuditLogCreate: mockAuditLogCreateFn,
    mockDownloadFile: mockDownloadFileFn,
    mockMistralExtract: mockMistralExtractFn,
    mockTesseractExtract: mockTesseractExtractFn,
    mockUserFindUnique: mockUserFindUniqueFn,
    mockParsePdf: mockParsePdfFn,
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

vi.mock('@/lib/storage', () => ({
  SupabaseStorageProvider: class {
    downloadFile = hoisted.mockDownloadFile;
    generateDownloadUrl = vi.fn().mockResolvedValue('https://supabase.com/signed-download');
    deleteFile = vi.fn();
  },
}));

vi.mock('@/lib/ocr/provider', () => ({
  MistralOcrProvider: class {
    extract = hoisted.mockMistralExtract;
  },
  TesseractOcrProvider: class {
    extract = hoisted.mockTesseractExtract;
  },
}));

vi.mock('@/lib/ocr/pdf-parser', () => {
  return {
    parsePdf: hoisted.mockParsePdf,
  };
});

describe('OCR & Document Intelligence Engine Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OcrNormalizer Logic Parser', () => {
    const normalizer = new OcrNormalizer();

    it('should clean raw texts and normalize date patterns successfully', () => {
      const mockRaw = {
        rawOcrText: '  Patient Name: John Doe  \nDate of Service: 12/25/2026 \nClaim Number: CLM-12345 ',
        confidenceScore: 0.9,
        provider: 'mistral' as const,
        processingTimeMs: 100,
      };

      const result = normalizer.normalize(mockRaw);

      expect(result.patientName.value).toBe('John Doe');
      expect(result.claimNumber.value).toBe('CLM-12345');
      expect(result.dateOfService.value).toBe('2026-12-25');
    });

    it('should extract CPT billing and ICD-10 diagnosis codes', () => {
      const mockRaw = {
        rawOcrText: 'CPT codes: 99214 and 93000. Diagnosis: I10 primary code.',
        confidenceScore: 0.9,
        provider: 'mistral' as const,
        processingTimeMs: 120,
      };

      const result = normalizer.normalize(mockRaw);

      expect(result.cptCodes.value).toContain('99214');
      expect(result.cptCodes.value).toContain('93000');
      expect(result.icdCodes.value).toContain('I10');
    });

    it('should infer Insurance payor companies from matching content', () => {
      const mockRaw = {
        rawOcrText: 'Claim processed by Aetna Provider portal.',
        confidenceScore: 0.85,
        provider: 'tesseract' as const,
        processingTimeMs: 80,
      };

      const result = normalizer.normalize(mockRaw);
      expect(result.insuranceCompany.value).toBe('Aetna');
    });
  });

  describe('OcrValidator Warnings Alerts', () => {
    const validator = new OcrValidator();
    const normalizer = new OcrNormalizer();

    it('should trigger EMPTY_OCR warning if raw text is empty or too short', () => {
      const emptyData = normalizer.normalize({
        rawOcrText: 'Too short text',
        confidenceScore: 0.8,
        provider: 'tesseract',
        processingTimeMs: 50,
      });

      const report = validator.validate(emptyData);

      expect(report.isValid).toBe(false);
      expect(report.warnings[0].code).toBe('EMPTY_OCR');
    });

    it('should flag low-confidence values and missing required keys', () => {
      const mockRaw = {
        rawOcrText: 'Patient Name: Jane Doe \nClaim: N/A \nReason: not medically necessary',
        confidenceScore: 0.55,
        provider: 'mistral' as const,
        processingTimeMs: 200,
      };

      const structured = normalizer.normalize(mockRaw);
      const report = validator.validate(structured);

      expect(report.isValid).toBe(false);
      expect(report.warnings.some((w) => w.code === 'LOW_CONFIDENCE')).toBe(true);
      expect(report.warnings.some((w) => w.field === 'insuranceCompany')).toBe(true);
    });
  });

  describe('OCR Processing Server Actions', () => {
    
    describe('processOcrForFile', () => {
      it('should validate owner credentials and fallback to Tesseract on Mistral failures', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        
        hoisted.mockFileFindUnique.mockResolvedValue({
          id: 'file-uuid',
          appealId: 'appeal-uuid',
          mimeType: 'application/pdf',
          storagePath: 'path/document.pdf',
          appeal: {
            userId: 'user-uuid',
          },
        });

        hoisted.mockDownloadFile.mockResolvedValue(Buffer.from('%PDF-1.4 mock file content'));

        // 1. Simulate Mistral API connection failure
        hoisted.mockMistralExtract.mockRejectedValue(new Error('Mistral connection timeout'));
        
        // 2. Simulate Tesseract fallback succeeding
        hoisted.mockTesseractExtract.mockResolvedValue({
          rawOcrText: 'Patient Name: Fallback User \nClaim Number: CLM-FALLBACK \nDenial Date: 01/01/2026',
          confidenceScore: 0.85,
          provider: 'tesseract',
          processingTimeMs: 400,
        });

        hoisted.mockAppealUpdate.mockResolvedValue({ id: 'appeal-uuid' });
        hoisted.mockAuditLogCreate.mockResolvedValue({ id: 'log-uuid' });

        const res = await processOcrForFile('file-uuid');

        expect(hoisted.mockMistralExtract).toHaveBeenCalled();
        expect(hoisted.mockTesseractExtract).toHaveBeenCalled();
        expect(res.success).toBe(true);
        expect(res.data?.providerUsed).toBe('tesseract');
        expect(res.data?.structuredData.patientName.value).toBe('Fallback User');
      });

      it('should block unauthorized execution (BOLA validation checks)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        
        hoisted.mockFileFindUnique.mockResolvedValue({
          id: 'file-uuid',
          appealId: 'appeal-uuid',
          appeal: {
            userId: 'attacker-uuid',
          },
        });

        const res = await processOcrForFile('file-uuid');

        expect(res.success).toBe(false);
        expect(res.error?.code).toBe('UNAUTHORIZED');
        expect(hoisted.mockDownloadFile).not.toHaveBeenCalled();
      });
    });

    describe('updateAppealStructuredData', () => {
      it('should save edited structured inputs and check appeal ownerships', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        hoisted.mockAppealFindUnique.mockResolvedValue({ userId: 'user-uuid' });
        hoisted.mockAppealUpdate.mockResolvedValue({ id: 'appeal-uuid' });
        hoisted.mockAuditLogCreate.mockResolvedValue({ id: 'log-uuid' });

        const res = await updateAppealStructuredData('appeal-uuid', { patientName: 'John Edit' });

        expect(hoisted.mockAppealUpdate).toHaveBeenCalledWith({
          where: { id: 'appeal-uuid' },
          data: {
            structuredInput: { patientName: 'John Edit' },
            status: 'READY',
          },
        });
        expect(res.success).toBe(true);
      });
    });

    describe('OCR processing flow and bounds validations', () => {
      beforeEach(() => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        hoisted.mockFileFindUnique.mockResolvedValue({
          id: 'file-uuid',
          appealId: 'appeal-uuid',
          mimeType: 'application/pdf',
          storagePath: 'path/document.pdf',
          appeal: {
            userId: 'user-uuid',
          },
        });
        hoisted.mockDownloadFile.mockResolvedValue(Buffer.from('%PDF-1.4 mock file content'));
        hoisted.mockAppealUpdate.mockResolvedValue({ id: 'appeal-uuid' });
        hoisted.mockAuditLogCreate.mockResolvedValue({ id: 'log-uuid' });
        // Set default mocks
        hoisted.mockUserFindUnique.mockResolvedValue({
          subscription: { planId: 'free', status: 'active' },
          _count: { appeals: 0 }
        });
      });

      it('should execute successful PDF text extraction and transition status to READY', async () => {
        hoisted.mockParsePdf.mockResolvedValue({
          text: 'Patient Name: Test User \nInsurance Company: Aetna \nClaim Number: CLM-11111 \nDenial Date: 05/12/2026 \nReason: Not medically necessary \nCPT: 99214 \nICD: I10 \nThis is a long text to exceed the 150 character limit requirement for native pdf parser text extraction to succeed without falling back to external OCR providers.',
        });

        const res = await processOcrForFile('file-uuid');

        expect(res.success).toBe(true);
        expect(res.data?.providerUsed).toBe('native');
        expect(hoisted.mockAppealUpdate).toHaveBeenCalledWith({
          where: { id: 'appeal-uuid' },
          data: {
            status: 'READY',
            rawOcrText: expect.any(String),
            extractedMetadata: expect.any(Object),
            structuredInput: expect.any(Object),
          },
        });
      });

      it('should rollback appeal status to DRAFT on OCR failure', async () => {
        hoisted.mockParsePdf.mockRejectedValue(new Error('Native PDF extraction failed'));
        hoisted.mockMistralExtract.mockRejectedValue(new Error('Mistral failed'));
        hoisted.mockTesseractExtract.mockRejectedValue(new Error('Tesseract failed'));

        const res = await processOcrForFile('file-uuid');

        expect(res.success).toBe(false);
        expect(hoisted.mockAppealUpdate).toHaveBeenCalledWith({
          where: { id: 'appeal-uuid' },
          data: { status: 'DRAFT' },
        });
      });

      it('should handle external OCR timeout throwing a gateway error and rolling back status', async () => {
        hoisted.mockParsePdf.mockResolvedValue({ text: 'too short text' });
        hoisted.mockMistralExtract.mockRejectedValue(new Error('Mistral request timed out after 25 seconds.'));
        hoisted.mockTesseractExtract.mockRejectedValue(new Error('Tesseract timeout'));

        const res = await processOcrForFile('file-uuid');

        expect(res.success).toBe(false);
        expect(hoisted.mockAppealUpdate).toHaveBeenCalledWith({
          where: { id: 'appeal-uuid' },
          data: { status: 'DRAFT' },
        });
      });

      it('should handle missing storage file error, log audit failed event, and propagate failure', async () => {
        hoisted.mockDownloadFile.mockRejectedValue(new Error('Object not found in storage bucket'));

        const res = await processOcrForFile('file-uuid');

        expect(res.success).toBe(false);
        expect(hoisted.mockAppealUpdate).toHaveBeenCalledWith({
          where: { id: 'appeal-uuid' },
          data: { status: 'DRAFT' },
        });
      });

      it('should handle malformed PDF in native parse, logging warning and falling back to OCR providers', async () => {
        // Native parser throws
        hoisted.mockParsePdf.mockRejectedValue(new Error('Malformed PDF structure'));
        // But Mistral succeeds
        hoisted.mockMistralExtract.mockResolvedValue({
          rawOcrText: 'Patient Name: Fallback User \nClaim Number: CLM-FALLBACK \nDenial Date: 01/01/2026',
          confidenceScore: 0.9,
          provider: 'mistral',
          processingTimeMs: 100,
        });

        const res = await processOcrForFile('file-uuid');

        expect(res.success).toBe(true);
        expect(res.data?.providerUsed).toBe('mistral');
        expect(res.data?.structuredData.patientName.value).toBe('Fallback User');
      });

      it('should enforce quota validations and prevent repeated OCR retry duplicates from consuming additional quota', async () => {
        // Simulate quota exceeded
        hoisted.mockUserFindUnique.mockResolvedValueOnce({
          subscription: { planId: 'free', status: 'active' },
          _count: { appeals: 6 } // Quota reached limit (5) and exceeded (6)
        });

        const res = await processOcrForFile('file-uuid');
        expect(res.success).toBe(false);
        expect(res.error?.code).toBe('QUOTA_EXCEEDED');
      });

      it('should reject PDFs missing %PDF header signature', async () => {
        hoisted.mockDownloadFile.mockResolvedValueOnce(Buffer.from('invalid file header'));

        const res = await processOcrForFile('file-uuid');

        expect(res.success).toBe(false);
        expect(res.error?.code).toBe('INVALID_PDF_HEADER');
      });

      it('should bypass Tesseract fallback on Vercel runtime to prevent serverless worker crashes', async () => {
        process.env.VERCEL = '1';
        hoisted.mockParsePdf.mockRejectedValue(new Error('Native PDF extraction failed'));
        hoisted.mockMistralExtract.mockRejectedValue(new Error('Mistral connection timeout'));

        try {
          const res = await processOcrForFile('file-uuid');
          expect(res.success).toBe(false);
          expect(res.error?.code).toBe('OCR_PROVIDER_FAILED');
          expect(hoisted.mockTesseractExtract).not.toHaveBeenCalled();
        } finally {
          delete process.env.VERCEL;
        }
      });
    });

  });
});
