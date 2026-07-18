import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  fetchAdminStatsAction, 
  fetchAdminUsersAction, 
  updateUserRoleAction, 
  updateUserSubscriptionAction,
  fetchFeatureFlagsAction,
  toggleFeatureFlagAction,
  fetchSystemAuditLogsAction,
  fetchSystemHealthAction
} from '@/app/actions/admin';

// Hoist mocks
const hoisted = vi.hoisted(() => {
  const mockUserCount = vi.fn();
  const mockUserFindMany = vi.fn();
  const mockUserUpdate = vi.fn();
  const mockAppealFindMany = vi.fn();
  const mockPaymentFindMany = vi.fn();
  const mockSubUpsert = vi.fn();
  const mockAuditLogCreate = vi.fn();
  const mockAuditLogFindMany = vi.fn();
  const mockFlagFindMany = vi.fn();
  const mockFlagFindUnique = vi.fn();
  const mockFlagUpdate = vi.fn();
  const mockFlagCreate = vi.fn();

  const mockPrisma: any = {
    user: {
      count: mockUserCount,
      findMany: mockUserFindMany,
      update: mockUserUpdate,
    },
    appeal: {
      findMany: mockAppealFindMany,
    },
    payment: {
      findMany: mockPaymentFindMany,
    },
    subscription: {
      upsert: mockSubUpsert,
    },
    auditLog: {
      create: mockAuditLogCreate,
      findMany: mockAuditLogFindMany,
    },
    featureFlag: {
      findMany: mockFlagFindMany,
      findUnique: mockFlagFindUnique,
      update: mockFlagUpdate,
      create: mockFlagCreate,
    },
  };

  return {
    mockPrisma,
    mockUserCount,
    mockUserFindMany,
    mockUserUpdate,
    mockAppealFindMany,
    mockPaymentFindMany,
    mockSubUpsert,
    mockAuditLogCreate,
    mockAuditLogFindMany,
    mockFlagFindMany,
    mockFlagFindUnique,
    mockFlagUpdate,
    mockFlagCreate,
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

describe('System Administration Server Actions Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization Checks', () => {
    it('should reject non-admin users with ForbiddenError code', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-uuid', 
            email: 'user@example.com',
            app_metadata: { role: 'USER' }
          } 
        },
        error: null,
      });

      const res = await fetchAdminStatsAction();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('FORBIDDEN');
    });

    it('should reject unauthenticated users with UnauthorizedError code', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const res = await fetchAdminUsersAction();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('System Statistics & Metrics Dashboard', () => {
    it('should fetch system-wide statistics when authenticated as ADMIN', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-uuid', 
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN' }
          } 
        },
        error: null,
      });

      hoisted.mockUserCount.mockResolvedValue(10);
      hoisted.mockAppealFindMany.mockResolvedValue([
        { id: 'appeal-1', extractedMetadata: { patient: { confidence: 0.9 } } },
        { id: 'appeal-2', extractedMetadata: { date: { confidence: 1.0 } } }
      ]);
      hoisted.mockPaymentFindMany.mockResolvedValue([
        { amount: 4900 },
        { amount: 4900 }
      ]);

      const res = await fetchAdminStatsAction();
      expect(res.success).toBe(true);
      expect(res.data?.totalUsers).toBe(10);
      expect(res.data?.totalAppeals).toBe(2);
      expect(res.data?.totalRevenue).toBe(98);
      expect(res.data?.averageOcrConfidence).toBeCloseTo(0.95, 2);
    });
  });

  describe('User Directories & Role Toggles', () => {
    it('should fetch users list successfully as ADMIN', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-uuid', 
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN' }
          } 
        },
        error: null,
      });

      hoisted.mockUserFindMany.mockResolvedValue([
        { id: 'user-1', email: 'user1@example.com', role: 'USER' }
      ]);

      const res = await fetchAdminUsersAction();
      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(1);
      expect(res.data?.[0].email).toBe('user1@example.com');
    });

    it('should successfully toggle user roles', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-uuid', 
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN' }
          } 
        },
        error: null,
      });

      hoisted.mockUserUpdate.mockResolvedValue({ id: 'user-1', role: 'ADMIN' });
      hoisted.mockAuditLogCreate.mockResolvedValue({ id: 'log-1' });

      const res = await updateUserRoleAction('user-1', 'ADMIN');
      expect(res.success).toBe(true);
      expect(hoisted.mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'ADMIN' }
      });
      expect(hoisted.mockAuditLogCreate).toHaveBeenCalled();
    });

    it('should block administrative self-demotion', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-uuid', 
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN' }
          } 
        },
        error: null,
      });

      const res = await updateUserRoleAction('admin-uuid', 'USER');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('SELF_DEMOTION_BLOCKED');
    });
  });

  describe('Subscription Modifiers & Plans', () => {
    it('should update user subscriptions levels', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-uuid', 
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN' }
          } 
        },
        error: null,
      });

      hoisted.mockSubUpsert.mockResolvedValue({ id: 'sub-1', planId: 'pro' });

      const res = await updateUserSubscriptionAction('user-1', 'pro');
      expect(res.success).toBe(true);
      expect(hoisted.mockSubUpsert).toHaveBeenCalled();
    });
  });

  describe('Feature Flags Configurations', () => {
    it('should query and toggle feature configuration keys', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-uuid', 
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN' }
          } 
        },
        error: null,
      });

      hoisted.mockFlagFindUnique.mockResolvedValue({ key: 'OCR_FALLBACK_ENABLED', value: true });
      hoisted.mockFlagUpdate.mockResolvedValue({ key: 'OCR_FALLBACK_ENABLED', value: false });

      const res = await toggleFeatureFlagAction('OCR_FALLBACK_ENABLED', false);
      expect(res.success).toBe(true);
      expect(hoisted.mockFlagUpdate).toHaveBeenCalled();
    });
  });

  describe('Audit Trails & Health Logs', () => {
    it('should fetch audit transactions successfully', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-uuid', 
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN' }
          } 
        },
        error: null,
      });

      hoisted.mockAuditLogFindMany.mockResolvedValue([{ id: 'log-1', action: 'FLAG_TOGGLED' }]);

      const res = await fetchSystemAuditLogsAction();
      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(1);
    });

    it('should retrieve system health statistics', async () => {
      mockGetUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-uuid', 
            email: 'admin@example.com',
            app_metadata: { role: 'ADMIN' }
          } 
        },
        error: null,
      });

      const res = await fetchSystemHealthAction();
      expect(res.success).toBe(true);
      expect(res.data?.database).toBe('ONLINE');
      expect(res.data?.openai).toContain('HEALTHY');
    });
  });
});
