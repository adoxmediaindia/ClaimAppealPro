import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpUser, loginUser, logoutUser, requestPasswordReset, updatePasswordAfterReset } from '@/app/actions/auth';
import { updateProfileAction } from '@/app/actions/profile';
import { GET as oauthCallbackHandler } from '@/app/api/v1/auth/callback/route';

// vi.hoisted allows variables to be declared and initialized before mock modules are resolved
const { mockPrisma, mockUserUpsert, mockUserFindUnique, mockProfileUpsert, mockAuditLogCreate } = vi.hoisted(() => {
  const mockUserUpsertFn = vi.fn();
  const mockUserFindUniqueFn = vi.fn();
  const mockProfileUpsertFn = vi.fn();
  const mockAuditLogCreateFn = vi.fn();

  const mockPrismaInstance: any = {
    user: {
      upsert: mockUserUpsertFn,
      findUnique: mockUserFindUniqueFn,
      create: vi.fn(),
    },
    profile: {
      upsert: mockProfileUpsertFn,
    },
    auditLog: {
      create: mockAuditLogCreateFn,
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrismaInstance)),
  };

  return {
    mockPrisma: mockPrismaInstance,
    mockUserUpsert: mockUserUpsertFn,
    mockUserFindUnique: mockUserFindUniqueFn,
    mockProfileUpsert: mockProfileUpsertFn,
    mockAuditLogCreate: mockAuditLogCreateFn,
  };
});

// Setup standard mock methods for Supabase Auth
const {
  mockSignUp,
  mockSignInWithPassword,
  mockSignOut,
  mockGetUser,
  mockResetPasswordForEmail,
  mockUpdateUser,
  mockSignInWithOAuth,
  mockExchangeCodeForSession,
  mockGenerateLink,
  mockDeleteUser,
} = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockGetUser: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockExchangeCodeForSession: vi.fn(),
  mockGenerateLink: vi.fn(),
  mockDeleteUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  createServerSideClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      signInWithOAuth: mockSignInWithOAuth,
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
  createAdminClient: () => ({
    auth: {
      admin: {
        generateLink: mockGenerateLink,
        deleteUser: mockDeleteUser,
      },
    },
  }),
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

describe('Authentication & Profile Upgraded Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUpUser Server Action', () => {
    it('should split fullName, validate E.164 phone, and create user and profile on Supabase and PostgreSQL', async () => {
      mockGenerateLink.mockResolvedValue({
        data: {
          user: { id: 'mock-uuid', email: 'test@example.com' },
          properties: { action_link: 'https://mock.supabase.co/verify?code=123' },
        },
        error: null,
      });

      mockUserUpsert.mockResolvedValue({ id: 'mock-uuid', email: 'test@example.com', role: 'USER' });
      mockProfileUpsert.mockResolvedValue({ id: 'profile-uuid', userId: 'mock-uuid' });

      const response = await signUpUser({
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        fullName: 'Michael Johnson',
        phone: '+1 555-555-5555',
        clinicName: 'Main Street Clinic',
      });

      expect(mockGenerateLink).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
        password: 'Password123!',
        options: {
          redirectTo: expect.stringContaining('/api/v1/auth/callback'),
        },
      });
      expect(response.success).toBe(true);
    });

    it('should reject signups when password and confirmPassword do not match', async () => {
      const response = await signUpUser({
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        fullName: 'Michael Johnson',
        phone: '+1 555-555-5555',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
      expect(response.error?.details?.confirmPassword?.[0]).toContain('do not match');
    });

    it('should validate and accept international/US phone formatting', async () => {
      mockGenerateLink.mockResolvedValue({
        data: {
          user: { id: 'mock-uuid', email: 'test@example.com' },
          properties: { action_link: 'https://mock.supabase.co/verify?code=123' },
        },
        error: null,
      });

      const response1 = await signUpUser({
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        fullName: 'John',
        phone: '+91 99999 88888', // Indian format
      });
      expect(response1.success).toBe(true);

      const response2 = await signUpUser({
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        fullName: 'John',
        phone: 'invalid-phone-number',
      });
      expect(response2.success).toBe(false);
      expect(response2.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('loginUser Server Action', () => {
    it('should allow login for verified user accounts and synchronize missing profiles', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'mock-uuid', email: 'test@example.com', email_confirmed_at: '2026-07-14T20:00:00Z' } },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue({ role: 'USER' });
      mockAuditLogCreate.mockResolvedValue({});

      const response = await loginUser({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(response.success).toBe(true);
      expect(response.data?.role).toBe('USER');
    });
  });

  describe('logoutUser Server Action', () => {
    it('should invoke Supabase signOut and log user out', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'mock-uuid' } } });
      mockSignOut.mockResolvedValue({ error: null });

      const response = await logoutUser();

      expect(mockSignOut).toHaveBeenCalled();
      expect(response.success).toBe(true);
    });
  });

  describe('Password Reset Server Actions', () => {
    describe('requestPasswordReset', () => {
      it('should trigger Supabase reset request and return success generically', async () => {
        mockGenerateLink.mockResolvedValue({
          data: {
            user: { id: 'mock-uuid', email: 'user@example.com' },
            properties: { action_link: 'https://mock.supabase.co/recovery?code=123' },
          },
          error: null,
        });

        const response = await requestPasswordReset({ email: 'user@example.com' });

        expect(mockGenerateLink).toHaveBeenCalledWith({
          type: 'recovery',
          email: 'user@example.com',
          options: expect.any(Object),
        });
        expect(response.success).toBe(true);
      });

      it('should block requests with invalid emails', async () => {
        const response = await requestPasswordReset({ email: 'not-an-email' });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('updatePasswordAfterReset', () => {
      it('should reject password changes if session user does not exist (expired link)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const response = await updatePasswordAfterReset({
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('UNAUTHORIZED');
      });

      it('should update password and invalidate all sessions if valid', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'mock-uuid' } } });
        mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
        mockSignOut.mockResolvedValue({ error: null });

        const response = await updatePasswordAfterReset({
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

        expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPassword123!' });
        expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
        expect(response.success).toBe(true);
      });
    });
  });

  describe('updateProfileAction Server Action', () => {
    it('should block profile update updates if user session does not exist', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await updateProfileAction({
        firstName: 'Michael',
        lastName: 'Johnson',
        clinicName: 'Primary Clinic',
        phone: '+1 555-555-5555',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('UNAUTHORIZED');
    });

    it('should save updated phone and name attributes for authenticated users', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'mock-uuid' } } });
      mockProfileUpsert.mockResolvedValue({});
      mockAuditLogCreate.mockResolvedValue({});

      const response = await updateProfileAction({
        firstName: 'Michael',
        lastName: 'Johnson',
        clinicName: 'Primary Clinic',
        phone: '+1 555-555-5555',
      });

      expect(mockProfileUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            firstName: 'Michael',
            lastName: 'Johnson',
            phone: '+15555555555',
          }),
        })
      );
      expect(response.success).toBe(true);
    });
  });

  describe('Password Recovery Redirect Callbacks', () => {
    it('should successfully handle OAuth callback requests and secure query parameters', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: {
          user: {
            id: 'mock-uuid',
            email: 'user@example.com',
            user_metadata: { given_name: 'John', family_name: 'Smith' },
          },
        },
        error: null,
      });

      mockUserUpsert.mockResolvedValue({ id: 'mock-uuid', email: 'user@example.com' });
      mockProfileUpsert.mockResolvedValue({});
      mockAuditLogCreate.mockResolvedValue({});

      const req = new Request('http://localhost:3000/api/v1/auth/callback?code=recovery-code&next=/reset-password');
      const response = await oauthCallbackHandler(req);

      expect(response.headers.get('location')).toBe('http://localhost:3000/reset-password');
    });
  });
});
