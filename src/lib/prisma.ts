import { PrismaClient } from '@prisma/client';
import { createMockPrismaProxy } from './mockPrisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

// Build self-healing database URL to prevent PgBouncer conflicts and connection leakage
let databaseUrl = process.env.DATABASE_URL || '';
if (
  databaseUrl &&
  !databaseUrl.includes('localhost') &&
  !databaseUrl.includes('127.0.0.1')
) {
  if (!databaseUrl.includes('pgbouncer=true')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}pgbouncer=true`;
  }
  if (!databaseUrl.includes('connection_limit=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}connection_limit=1`;
  }
}

if (process.env.NODE_ENV === 'production') {
  // Production gets a clean, direct, unproxied PrismaClient singleton instance
  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ['error'],
  });
} else {
  // Development/Test environments use the mock/fallback proxy wrapper
  const realPrisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ['query', 'error', 'warn'],
  });

  prismaInstance = createMockPrismaProxy(realPrisma) as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? prismaInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

// Maintain backwards compatibility for existing unit tests
export { getMockState, saveMockState } from './mockPrisma';
