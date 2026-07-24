import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptBuilder } from '@/lib/ai/promptBuilder';
import { ResponseValidator } from '@/lib/ai/validator';
import { AppealFormatter } from '@/lib/ai/formatter';
import { generateAppealAction, rollbackAppealVersionAction } from '@/app/actions/ai';

// 1. Hoist Prisma mocks
const hoisted = vi.hoisted(() => {
  const mockAppealFindUniqueFn = vi.fn();
  const mockAppealUpdateFn = vi.fn();
  const mockVersionCreateFn = vi.fn();
  const mockGenCreateFn = vi.fn();
  const mockUsageLogCreateFn = vi.fn();
  const mockAuditLogCreateFn = vi.fn();
  const mockUserFindUniqueFn = vi.fn().mockResolvedValue({
    subscription: { planId: 'free', status: 'active' },
    _count: { appeals: 0 }
  });
  const mockTransactionFn = vi.fn().mockImplementation(async (callback) => {
    return callback(mockPrismaInstance);
  });

  const mockPrismaInstance: any = {
    user: {
      findUnique: mockUserFindUniqueFn,
    },
    appeal: {
      findUnique: mockAppealFindUniqueFn,
      update: mockAppealUpdateFn,
    },
    appealVersion: {
      create: mockVersionCreateFn,
    },
    aiGeneration: {
      create: mockGenCreateFn,
    },
    usageLog: {
      create: mockUsageLogCreateFn,
    },
    auditLog: {
      create: mockAuditLogCreateFn,
    },
    $transaction: mockTransactionFn,
  };

  return {
    mockPrisma: mockPrismaInstance,
    mockAppealFindUnique: mockAppealFindUniqueFn,
    mockAppealUpdate: mockAppealUpdateFn,
    mockVersionCreate: mockVersionCreateFn,
    mockGenCreate: mockGenCreateFn,
    mockUsageLogCreate: mockUsageLogCreateFn,
    mockAuditLogCreate: mockAuditLogCreateFn,
    mockTransaction: mockTransactionFn,
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

// Set process.env to trigger mock completion mode safely
process.env.OPENAI_API_KEY = 'sk-proj-your-openai-key';
process.env.GEMINI_API_KEY = 'mock-gemini-key';
process.env.AI_PROVIDER = 'gemini';

describe('AI Appeal Generation Engine Pipeline Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PromptBuilder Engine', () => {
    const builder = new PromptBuilder();

    it('should build deterministic system templates injecting validated fields', () => {
      const mockMeta = {
        patientName: 'Jane Smith',
        claimNumber: 'CLM-98765',
        denialReason: 'Not medically necessary',
        denialDate: '2026-05-12',
      };

      const prompt = builder.build(mockMeta, 'v1.0');
      expect(prompt).toContain('PROMPT TEMPLATE VERSION: v1.0');
      expect(prompt).toContain('PATIENT NAME: Jane Smith');
      expect(prompt).toContain('CLAIM NUMBER: CLM-98765');
      expect(prompt).toContain('DENIAL REASON: Not medically necessary');
    });

    it('should omit low-confidence values (<0.85) unless confirmed by user', () => {
      const mockMeta = {
        patientName: 'Jane Smith',
        claimNumber: { value: 'CLM-LOW', confidence: 0.5, confirmed: false },
        denialReason: { value: 'Reason Confirmed', confidence: 0.6, confirmed: true },
      };

      const prompt = builder.build(mockMeta, 'v1.1');
      expect(prompt).toContain('PATIENT NAME: Jane Smith');
      expect(prompt).not.toContain('CLAIM NUMBER'); // Omitted due to low confidence and unconfirmed status
      expect(prompt).toContain('DENIAL REASON: Reason Confirmed'); // Included because it is confirmed
    });
  });

  describe('ResponseValidator Engine', () => {
    const validator = new ResponseValidator();
    const mockOriginal = {
      patientName: 'John Doe',
      claimNumber: 'CLM-55555',
    };

    it('should pass complete generation layouts without errors', () => {
      const mockResult = {
        title: 'Appeal Subject - Claim CLM-55555 John Doe',
        executiveSummary: 'This is an appeal for John Doe.',
        medicalNecessity: 'Medical argument details.',
        policyArgument: 'Policy terms.',
        supportingEvidence: 'List of documents.',
        closingRequest: 'Expedite reversal.',
        formattedLetter: 'Formatted letter text.',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20, cost: 0.0001 },
        modelUsed: 'gpt-4o',
      };

      const report = validator.validate(mockResult, mockOriginal);
      expect(report.isValid).toBe(true);
      expect(report.errors.length).toBe(0);
    });

    it('should report validation errors for missing clinical blocks', () => {
      const mockResult = {
        title: 'Subject Line',
        executiveSummary: '', // Empty field
        medicalNecessity: 'Medical argument details.',
        policyArgument: 'Policy terms.',
        supportingEvidence: 'List of documents.',
        closingRequest: 'Expedite reversal.',
        formattedLetter: 'Formatted letter text.',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20, cost: 0.0001 },
        modelUsed: 'gpt-4o',
      };

      const report = validator.validate(mockResult, mockOriginal);
      expect(report.isValid).toBe(false);
      expect(report.errors[0]).toContain('Missing required appeal section: executiveSummary');
    });

    it('should fail validation if original Patient Name or Claim Number is hallucinated/missing', () => {
      const mockResult = {
        title: 'Appeal Subject - Claim CLM-55555',
        executiveSummary: 'This is an appeal for Jane Smith (Hallucinated Patient).', // Patient name mismatched
        medicalNecessity: 'Medical argument details.',
        policyArgument: 'Policy terms.',
        supportingEvidence: 'List of documents.',
        closingRequest: 'Expedite reversal.',
        formattedLetter: 'Formatted letter text.',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20, cost: 0.0001 },
        modelUsed: 'gpt-4o',
      };

      const report = validator.validate(mockResult, mockOriginal);
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.includes('Patient name "John Doe" is missing'))).toBe(true);
    });
  });

  describe('AppealFormatter Engine', () => {
    const formatter = new AppealFormatter();

    it('should assemble structured parts into a double-spaced document', () => {
      const mockInput = {
        title: 'Subject Line Title',
        executiveSummary: 'Exec summary body',
        medicalNecessity: 'Necessity body',
        policyArgument: 'Policy body',
        supportingEvidence: 'Evidence body',
        closingRequest: 'Closing body',
      };

      const output = formatter.format(mockInput);
      expect(output).toContain('EXECUTIVE SUMMARY\n\nExec summary body');
      expect(output).toContain('MEDICAL NECESSITY ARGUMENT\n\nNecessity body');
      expect(output).toContain('---');
    });
  });

  describe('AI Generation Actions', () => {
    
    describe('generateAppealAction', () => {
      it('should enforce user session checks and block BOLA violations', async () => {
        // Authenticated user
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        
        // Appeal belongs to a different owner
        hoisted.mockAppealFindUnique.mockResolvedValue({
          id: 'appeal-uuid',
          userId: 'attacker-uuid',
          status: 'READY',
          deletedAt: null,
          versions: [],
        });

        const res = await generateAppealAction('appeal-uuid');
        expect(res.success).toBe(false);
        expect(res.error?.code).toBe('UNAUTHORIZED');
      });

      it('should process generation, create appeal version, and write usage metrics in a transaction', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        
        hoisted.mockAppealFindUnique.mockResolvedValue({
          id: 'appeal-uuid',
          userId: 'user-uuid',
          status: 'READY',
          deletedAt: null,
          structuredInput: {
            patientName: 'Jane Smith',
            claimNumber: 'CLM-98765',
            denialReason: 'Not medically necessary',
          },
          versions: [{ versionNumber: 1 }],
        });

        hoisted.mockAppealUpdate.mockResolvedValue({ id: 'appeal-uuid', status: 'GENERATED' });
        hoisted.mockVersionCreate.mockResolvedValue({ id: 'ver-uuid' });
        hoisted.mockGenCreate.mockResolvedValue({ id: 'gen-uuid' });
        hoisted.mockUsageLogCreate.mockResolvedValue({ id: 'usage-uuid' });
        hoisted.mockAuditLogCreate.mockResolvedValue({ id: 'audit-uuid' });

        const res = await generateAppealAction('appeal-uuid');

        expect(hoisted.mockTransaction).toHaveBeenCalled();
        expect(hoisted.mockVersionCreate).toHaveBeenCalled();
        expect(hoisted.mockAppealUpdate).toHaveBeenCalledWith({
          where: { id: 'appeal-uuid' },
          data: { status: 'GENERATED' },
        });
        expect(res.success).toBe(true);
        expect(res.data?.versionNumber).toBe(2);
      });
    });

    describe('rollbackAppealVersionAction', () => {
      it('should fetch the target draft version and roll forward inside database transactions', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        
        hoisted.mockAppealFindUnique.mockResolvedValue({
          id: 'appeal-uuid',
          userId: 'user-uuid',
          deletedAt: null,
          versions: [
            { id: 'ver-2', versionNumber: 2, letterContent: 'Content of version 2', editorState: {} },
            { id: 'ver-1', versionNumber: 1, letterContent: 'Content of version 1', editorState: {} },
          ],
        });

        hoisted.mockVersionCreate.mockResolvedValue({ id: 'ver-3' });
        hoisted.mockAuditLogCreate.mockResolvedValue({ id: 'audit-uuid' });

        // Request rollback to version 1
        const res = await rollbackAppealVersionAction('appeal-uuid', 1);

        expect(hoisted.mockTransaction).toHaveBeenCalled();
        expect(hoisted.mockVersionCreate).toHaveBeenCalledWith({
          data: {
            appealId: 'appeal-uuid',
            versionNumber: 3, // Increment version roll-forward
            letterContent: 'Content of version 1',
            editorState: {},
          },
        });
        expect(res.success).toBe(true);
        expect(res.data?.versionNumber).toBe(3);
      });
    });

  });
});
