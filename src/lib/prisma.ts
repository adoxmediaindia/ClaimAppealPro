import { PrismaClient } from '@prisma/client';
import { createMockPrismaProxy } from './mockPrisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // Production gets a clean, direct, unproxied PrismaClient singleton instance
  prismaInstance = new PrismaClient({
    log: ['error'],
  });
} else {
  // Development/Test environments use the mock/fallback proxy wrapper
  const realPrisma = new PrismaClient({
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
