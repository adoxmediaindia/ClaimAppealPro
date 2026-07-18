import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpUser, loginUser, logoutUser, requestPasswordReset, updatePasswordAfterReset, signInWithGoogle } from '@/app/actions/auth';
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
} = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockGetUser: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockExchangeCodeForSession: vi.fn(),
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
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

describe('Authentication Server Actions Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUpUser Server Action', () => {
    it('should validate signup schemas and create users on Supabase and PostgreSQL', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'mock-uuid', email: 'test@example.com' }, session: null },
        error: null,
      });

      mockUserUpsert.mockResolvedValue({ id: 'mock-uuid', email: 'test@example.com', role: 'USER' });
      mockProfileUpsert.mockResolvedValue({ id: 'profile-uuid', userId: 'mock-uuid' });

      const response = await signUpUser({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        options: {
          data: { firstName: 'John', lastName: 'Doe', role: 'USER' },
        },
      });
      expect(response.success).toBe(true);
      expect(response.data?.requiresVerification).toBe(true);
    });

    it('should reject signups containing weak passwords', async () => {
      const response = await signUpUser({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should block disposable email domains', async () => {
      const response = await signUpUser({
        email: 'test@mailinator.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('loginUser Server Action', () => {
    it('should block login if the email is not verified', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'mock-uuid', email: 'test@example.com', email_confirmed_at: null } },
        error: null,
      });

      const response = await loginUser({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('UNAUTHORIZED');
      expect(response.error?.message).toContain('Invalid email, incorrect password, or unverified account.');
    });

    it('should authorize logins for verified accounts', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'mock-uuid', email: 'test@example.com', email_confirmed_at: '2026-07-14T20:00:00Z' } },
        error: null,
      });

      mockUserFindUnique.mockResolvedValue({ role: 'USER' });

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
        mockResetPasswordForEmail.mockResolvedValue({ error: null });

        const response = await requestPasswordReset({ email: 'user@example.com' });

        expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', expect.any(Object));
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
        expect(response.error?.message).toContain('expired');
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

  describe('Google OAuth Server Actions & Callbacks', () => {
    describe('signInWithGoogle Server Action', () => {
      it('should invoke Supabase OAuth flow and return authorization url', async () => {
        mockSignInWithOAuth.mockResolvedValue({
          data: { provider: 'google', url: 'https://google.com/oauth' },
          error: null,
        });

        const response = await signInWithGoogle();

        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/callback'),
          }),
        });
        expect(response.success).toBe(true);
        expect(response.data?.url).toBe('https://google.com/oauth');
      });
    });

    describe('OAuth Callback API Handler Route', () => {
      it('should redirect to login if code query parameter is missing', async () => {
        const req = new Request('http://localhost:3000/api/v1/auth/callback');
        const response = await oauthCallbackHandler(req);

        expect(response.status).toBe(307); // NextResponse.redirect status
        expect(response.headers.get('location')).toContain('/login?error=OAUTH_MISSING_CODE');
      });

      it('should exchange code and register profile metadata in database', async () => {
        mockExchangeCodeForSession.mockResolvedValue({
          data: {
            user: {
              id: 'google-uuid',
              email: 'google@example.com',
              user_metadata: { given_name: 'Google', family_name: 'User' },
            },
          },
          error: null,
        });

        mockUserUpsert.mockResolvedValue({ id: 'google-uuid', email: 'google@example.com' });
        mockProfileUpsert.mockResolvedValue({ id: 'profile-uuid' });
        mockAuditLogCreate.mockResolvedValue({ id: 'audit-uuid' });

        const req = new Request('http://localhost:3000/api/v1/auth/callback?code=valid-code');
        const response = await oauthCallbackHandler(req);

        expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code');
        expect(mockUserUpsert).toHaveBeenCalled();
        expect(mockProfileUpsert).toHaveBeenCalled();
        expect(mockAuditLogCreate).toHaveBeenCalled();
        expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
      });

      it('should prevent open redirect hijacking attempts', async () => {
        mockExchangeCodeForSession.mockResolvedValue({
          data: {
            user: { id: 'google-uuid', email: 'google@example.com' },
          },
          error: null,
        });

        const req = new Request(
          'http://localhost:3000/api/v1/auth/callback?code=valid-code&next=https://malicious-site.com'
        );
        const response = await oauthCallbackHandler(req);

        // Should ignore malicious domain and redirect to fallback /dashboard
        expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
      });
    });
  });
});
