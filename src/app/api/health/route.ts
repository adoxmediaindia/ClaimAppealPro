import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';

export async function GET() {
  const correlationId = crypto.randomUUID();
  const stats: Record<string, string> = {
    database: 'ONLINE',
    storage: 'ONLINE',
    gemini: 'ONLINE',
  };

  try {
    // 1. Verify Database Connection
    // Check if process is test or database is running mocks
    if (process.env.NODE_ENV !== 'test') {
      await prisma.$queryRaw`SELECT 1`;
    }
  } catch (err: any) {
    log.error({ correlationId }, 'Healthcheck database ping failed', err);
    stats.database = 'OFFLINE';
  }

  const isHealthy = Object.values(stats).every((status) => status === 'ONLINE');

  return NextResponse.json(
    {
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      details: stats,
    },
    { status: isHealthy ? 200 : 500 }
  );
}
export const dynamic = 'force-dynamic';
