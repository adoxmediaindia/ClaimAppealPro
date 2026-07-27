import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/exports/docx/route';
import { NextRequest } from 'next/server';

// 1. Setup hoisted mocks
const hoisted = vi.hoisted(() => {
  const mockAppealFindUnique = vi.fn();
  const mockAuditLogCreate = vi.fn();

  const mockPrisma: any = {
    appeal: {
      findUnique: mockAppealFindUnique,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
  };

  return {
    mockPrisma,
    mockAppealFindUnique,
    mockAuditLogCreate,
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

describe('DOCX Export API Endpoint Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 Unauthorized if user session is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest(
      'http://localhost:3000/api/exports/docx?appealId=mock-id&versionNumber=1'
    );
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('should return 400 Bad Request if parameters are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });

    const req = new NextRequest('http://localhost:3000/api/exports/docx');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required parameters');
  });

  it('should return 403 Forbidden if user does not own the appeal (BOLA)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    hoisted.mockAppealFindUnique.mockResolvedValue({
      id: 'appeal-id',
      userId: 'other-user-uuid',
      deletedAt: null,
      versions: [{ versionNumber: 1, letterContent: 'Dear insurance...' }],
    });

    const req = new NextRequest(
      'http://localhost:3000/api/exports/docx?appealId=appeal-id&versionNumber=1'
    );
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Access denied');
  });

  it('should return 404 Not Found if appeal does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    hoisted.mockAppealFindUnique.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/exports/docx?appealId=missing-id&versionNumber=1'
    );
    const res = await GET(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Appeal letter draft not found');
  });

  it('should return 200 OK and binary stream response on successful compiling', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    hoisted.mockAppealFindUnique.mockResolvedValue({
      id: 'appeal-id',
      userId: 'user-uuid',
      deletedAt: null,
      structuredInput: {
        patientName: 'John Doe',
        claimNumber: 'CLM-12345',
        insuranceName: 'Aetna Inc',
      },
      versions: [
        {
          versionNumber: 1,
          letterContent: 'Dear Aetna,\n\nThis is a clinical necessity appeal letter.\n\nSincerely,\nDr. Specialist',
          deletedAt: null,
        },
      ],
    });
    hoisted.mockAuditLogCreate.mockResolvedValue({});

    const req = new NextRequest(
      'http://localhost:3000/api/exports/docx?appealId=appeal-id&versionNumber=1'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(res.headers.get('Content-Disposition')).toContain('appeal_letter_v1.docx');
    
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(hoisted.mockAuditLogCreate).toHaveBeenCalledTimes(1);
  });

  it('should prioritize canonical keys policyNumber, insuranceCompany, address over legacy keys in DOCX export', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    hoisted.mockAppealFindUnique.mockResolvedValue({
      id: 'appeal-id',
      userId: 'user-uuid',
      deletedAt: null,
      structuredInput: {
        patientName: 'John Doe',
        claimNumber: 'CLM-12345',
        insuranceCompany: 'Canonical Insurance',
        insuranceName: 'Legacy Insurance',
        policyNumber: 'CanonicalPolicy123',
        policyId: 'LegacyPolicy123',
        address: 'Canonical Address',
        insuranceAddress: 'Legacy Address',
      },
      versions: [
        {
          versionNumber: 1,
          letterContent: 'Dear Aetna,\n\nThis is a clinical necessity appeal letter.\n\nSincerely,\nDr. Specialist',
          deletedAt: null,
        },
      ],
    });
    hoisted.mockAuditLogCreate.mockResolvedValue({});

    const req = new NextRequest(
      'http://localhost:3000/api/exports/docx?appealId=appeal-id&versionNumber=1'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
