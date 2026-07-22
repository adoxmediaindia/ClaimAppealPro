import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStorageProvider } from '@/lib/storage';
import { getPresignedUploadUrl, registerUploadedFile, deleteUploadedFile } from '@/app/actions/upload';

// vi.hoisted variables for Vitest mock hoisting resolution
const { mockPrisma, mockAuditLogCreate, mockAppealCreate, mockFileCreate, mockFileFindUnique, mockFileDelete } = vi.hoisted(() => {
  const mockAuditLogCreateFn = vi.fn();
  const mockAppealCreateFn = vi.fn();
  const mockFileCreateFn = vi.fn();
  const mockFileFindUniqueFn = vi.fn();
  const mockFileDeleteFn = vi.fn();

  const mockPrismaInstance: any = {
    auditLog: {
      create: mockAuditLogCreateFn,
    },
    appeal: {
      create: mockAppealCreateFn,
      findUnique: vi.fn(),
    },
    file: {
      create: mockFileCreateFn,
      findUnique: mockFileFindUniqueFn,
      delete: mockFileDeleteFn,
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrismaInstance)),
  };

  return {
    mockPrisma: mockPrismaInstance,
    mockAuditLogCreate: mockAuditLogCreateFn,
    mockAppealCreate: mockAppealCreateFn,
    mockFileCreate: mockFileCreateFn,
    mockFileFindUnique: mockFileFindUniqueFn,
    mockFileDelete: mockFileDeleteFn,
  };
});

const { mockCreateSignedUploadUrl, mockCreateSignedUrl, mockRemove, mockGetUser } = vi.hoisted(() => ({
  mockCreateSignedUploadUrl: vi.fn(),
  mockCreateSignedUrl: vi.fn(),
  mockRemove: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => {
  const mockClient = {
    auth: {
      getUser: mockGetUser,
    },
    storage: {
      getBucket: vi.fn().mockResolvedValue({ data: { id: 'denials' }, error: null }),
      createBucket: vi.fn().mockResolvedValue({ data: { name: 'denials' }, error: null }),
      from: () => ({
        createSignedUploadUrl: mockCreateSignedUploadUrl,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      }),
    },
  };
  return {
    createServerSideClient: () => mockClient,
    createAdminClient: () => mockClient,
  };
});

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

describe('Document Upload System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SupabaseStorageProvider Model', () => {
    const provider = new SupabaseStorageProvider();

    it('should block file uploads exceeding 10MB size limit', async () => {
      await expect(
        provider.generateUploadUrl('user-id', 'test.pdf', 'application/pdf', 15 * 1024 * 1024)
      ).rejects.toThrow('File size exceeds the maximum 10MB limit');
    });

    it('should reject unaccepted MIME file types', async () => {
      await expect(
        provider.generateUploadUrl('user-id', 'malicious.exe', 'application/octet-stream', 1024)
      ).rejects.toThrow('Only PDF, JPG, and PNG files are allowed');
    });

    it('should generate secure path structures and signed upload urls', async () => {
      mockCreateSignedUploadUrl.mockResolvedValue({
        data: { signedUrl: 'https://supabase.com/signed-upload-path' },
        error: null,
      });

      const { uploadUrl, storagePath } = await provider.generateUploadUrl(
        'user-uuid',
        'document.png',
        'image/png',
        2 * 1024 * 1024
      );

      expect(uploadUrl).toBe('https://supabase.com/signed-upload-path');
      expect(storagePath).toContain('users/user-uuid/claims/');
      expect(storagePath.endsWith('.png')).toBe(true);

    });
  });

  describe('Upload Server Actions', () => {
    
    describe('getPresignedUploadUrl Action', () => {
      it('should validate session credentials and yield secure upload links', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        mockCreateSignedUploadUrl.mockResolvedValue({
          data: { signedUrl: 'https://supabase.com/signed-path' },
          error: null,
        });

        const res = await getPresignedUploadUrl('medical.pdf', 'application/pdf', 100 * 1024);

        expect(res.success).toBe(true);
        expect(res.data?.uploadUrl).toBe('https://supabase.com/signed-path');
      });

      it('should block anonymous requests', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const res = await getPresignedUploadUrl('test.pdf', 'application/pdf', 1024);

        expect(res.success).toBe(false);
        expect(res.error?.code).toBe('UNAUTHORIZED');
      });
    });

    describe('registerUploadedFile Action', () => {
      it('should register uploaded file under a new appeal draft', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        
        mockAppealCreate.mockResolvedValue({ id: 'appeal-uuid' });
        mockFileCreate.mockResolvedValue({ id: 'file-uuid' });
        mockAuditLogCreate.mockResolvedValue({ id: 'log-uuid' });

        const res = await registerUploadedFile(
          null, // new appeal draft
          'denial.pdf',
          500 * 1024,
          'application/pdf',
          'users/user-uuid/claims/sample.pdf'
        );

        expect(res.success).toBe(true);
        expect(res.data?.fileId).toBe('file-uuid');
        expect(res.data?.appealId).toBe('appeal-uuid');
      });
    });

    describe('deleteUploadedFile Action (BOLA check)', () => {
      it('should block file deletions if file belongs to another user', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        
        // Mock file record belonging to a different owner 'attacker-uuid'
        mockFileFindUnique.mockResolvedValue({
          id: 'file-uuid',
          storagePath: 'path/file.pdf',
          appeal: {
            userId: 'attacker-uuid',
          },
        });

        const res = await deleteUploadedFile('file-uuid');

        expect(res.success).toBe(false);
        expect(res.error?.code).toBe('UNAUTHORIZED');
        expect(mockFileDelete).not.toHaveBeenCalled();
      });

      it('should allow file owner to delete file from DB and Supabase', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
        
        mockFileFindUnique.mockResolvedValue({
          id: 'file-uuid',
          storagePath: 'path/file.pdf',
          appeal: {
            userId: 'user-uuid',
          },
        });
        
        mockRemove.mockResolvedValue({ data: [], error: null });
        mockFileDelete.mockResolvedValue({ id: 'file-uuid' });
        mockAuditLogCreate.mockResolvedValue({ id: 'log-uuid' });

        const res = await deleteUploadedFile('file-uuid');

        expect(mockRemove).toHaveBeenCalledWith(['path/file.pdf']);
        expect(mockFileDelete).toHaveBeenCalled();
        expect(res.success).toBe(true);
      });
    });

  });
});
