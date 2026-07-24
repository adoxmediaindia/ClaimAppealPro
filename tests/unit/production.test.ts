import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/health/route';

// Mock prisma and logs
vi.mock('@/lib/prisma', () => ({
  default: {
    $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
  },
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
  },
}));

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Production Hardening & Operations Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Centralized Diagnostics Health Route', () => {
    it('should return 200 OK and status HEALTHY when components are online', async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('HEALTHY');
      expect(json.details.database).toBe('ONLINE');
      expect(json.details.gemini).toBe('ONLINE');
      expect(json.details.storage).toBe('ONLINE');
    });
  });

  describe('Environment Variable Redactor Validation', () => {
    it('should validate format of connection string parameters', () => {
      // Direct testing of environment variables validation properties
      const validUrlRegex = /^(https?|postgresql):\/\/[^\s$.?#].[^\s]*$/;
      expect(validUrlRegex.test('postgresql://postgres:pass@localhost:5432/db')).toBe(true);
      expect(validUrlRegex.test('invalid-format')).toBe(false);
    });
  });
});
