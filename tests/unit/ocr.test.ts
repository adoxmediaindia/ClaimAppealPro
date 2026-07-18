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

        hoisted.mockDownloadFile.mockResolvedValue(Buffer.from('mock file content'));

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

  });
});
