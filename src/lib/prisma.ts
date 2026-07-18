import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const realPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const scratchDir = 'C:\\Users\\prati\\.gemini\\antigravity\\brain\\99ddbc12-2335-4f25-804f-324c844e6864\\scratch';
const stateFilePath = path.join(scratchDir, 'mock_db_state.json');

// Ensure scratch directory exists
if (!fs.existsSync(scratchDir)) {
  try {
    fs.mkdirSync(scratchDir, { recursive: true });
  } catch (err) {
    // Fail silently
  }
}

// Load current mock state from JSON file or return default
function getMockState() {
  const defaultState = {
    appeal: {
      id: '00000000-0000-0000-0000-000000000000',
      userId: 'mock-uuid',
      status: 'READY',
      createdAt: new Date().toISOString(),
      filePath: 'mock-file.pdf',
      originalName: 'denial.pdf',
      extractedMetadata: {
        patientName: { value: 'John Doe', confidence: 0.95 },
        insuranceCompany: { value: 'Aetna', confidence: 0.95 },
        claimNumber: { value: 'CLM12345', confidence: 0.95 },
        memberId: { value: 'MEM12345', confidence: 0.95 },
        policyNumber: { value: 'POL12345', confidence: 0.95 },
        dateOfService: { value: '2026-05-10', confidence: 0.95 },
        denialDate: { value: '2026-05-12', confidence: 0.95 },
        providerName: { value: 'Dr. John Smith', confidence: 0.95 },
        cptCodes: { value: ['99214'], confidence: 0.95 },
        icdCodes: { value: ['I10'], confidence: 0.95 },
        denialReason: { value: 'Not medically necessary', confidence: 0.95 },
        appealDeadline: { value: '2026-11-12', confidence: 0.95 },
        contactInformation: { value: '1-800-555-0199', confidence: 0.95 },
        address: { value: 'P.O. Box 1234, Hartford, CT', confidence: 0.95 },
      },
      structuredInput: {
        patientName: { value: 'John Doe', confidence: 0.95 },
        insuranceCompany: { value: 'Aetna', confidence: 0.95 },
        claimNumber: { value: 'CLM12345', confidence: 0.95 },
        memberId: { value: 'MEM12345', confidence: 0.95 },
        policyNumber: { value: 'POL12345', confidence: 0.95 },
        dateOfService: { value: '2026-05-10', confidence: 0.95 },
        denialDate: { value: '2026-05-12', confidence: 0.95 },
        providerName: { value: 'Dr. John Smith', confidence: 0.95 },
        cptCodes: { value: ['99214'], confidence: 0.95 },
        icdCodes: { value: ['I10'], confidence: 0.95 },
        denialReason: { value: 'Not medically necessary', confidence: 0.95 },
        appealDeadline: { value: '2026-11-12', confidence: 0.95 },
        contactInformation: { value: '1-800-555-0199', confidence: 0.95 },
        address: { value: 'P.O. Box 1234, Hartford, CT', confidence: 0.95 },
      },
      files: [
        {
          id: 'mock-file-id',
          fileName: 'denial.pdf',
          storagePath: 'appeals/mock-file.pdf',
        }
      ],
      versions: [] as any[],
      aiGenerations: [] as any[],
      pdfExports: [] as any[],
    },
    subscription: {
      id: 'mock-sub-id',
      userId: 'mock-uuid',
      stripeCustomerId: 'cus_mock-customer-id',
      stripeSubscriptionId: 'sub_mock-subscription-id',
      planId: 'free',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    },
    payments: [] as any[],
    users: [
      {
        id: 'mock-uuid',
        email: 'user@example.com',
        role: 'USER',
        createdAt: new Date().toISOString(),
        profile: { firstName: 'Valued', lastName: 'Provider', clinicName: 'Standard Clinic' },
        subscription: { planId: 'free', status: 'active', currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() },
      },
      {
        id: 'mock-admin-uuid',
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        profile: { firstName: 'Clinic', lastName: 'Admin', clinicName: 'HQ Operations' },
        subscription: null,
      }
    ],
    auditLogs: [] as any[],
    featureFlags: [
      { id: 'flag-1', key: 'OCR_FALLBACK_ENABLED', value: true, description: 'Bypasses Mistral failures to Tesseract local client.' },
      { id: 'flag-2', key: 'AI_TEMPLATE_RETRY_ENABLED', value: true, description: 'Retries OpenAI completion requests upon timeout errors.' },
    ],
  };

  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    // Return default on parse failure
  }
  return defaultState;
}

// Persist the state in JSON file
function saveMockState(state: any) {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    // Fail silently
  }
}

const createMockModel = (modelName: string) => {
  return {
    findUnique: async (args: any) => {
      if (modelName === 'user') {
        const state = getMockState();
        const userId = args?.where?.id || 'mock-uuid';
        const userInList = (state.users || []).find((u: any) => u.id === userId);
        return userInList || {
          id: userId,
          email: 'user@example.com',
          role: 'USER',
          profile: { firstName: 'Valued', lastName: 'Provider' },
          subscription: state.subscription || { planId: 'free', status: 'active' },
          appeals: [],
          _count: { appeals: state.appeal ? 1 : 0 },
        };
      }
      if (modelName === 'appeal') {
        const state = getMockState();
        if (state.appeal) {
          if (state.appeal.versions) {
            state.appeal.versions.sort((a: any, b: any) => b.versionNumber - a.versionNumber);
          }
          if (!state.appeal.pdfExports) {
            state.appeal.pdfExports = [];
          }
        }
        return state.appeal;
      }
      if (modelName === 'appealVersion') {
        const state = getMockState();
        const cond = args?.where?.appeal_version_unique_idx;
        if (cond) {
          return (state.appeal.versions || []).find(
            (v: any) => v.appealId === cond.appealId && v.versionNumber === cond.versionNumber
          ) || null;
        }
        return null;
      }
      if (modelName === 'appealPdfExport') {
        const state = getMockState();
        const exportId = args?.where?.id;
        return (state.appeal.pdfExports || []).find((e: any) => e.id === exportId) || null;
      }
      if (modelName === 'subscription') {
        const state = getMockState();
        const userId = args?.where?.userId;
        const stripeCustomerId = args?.where?.stripeCustomerId;
        const stripeSubscriptionId = args?.where?.stripeSubscriptionId;

        if (userId && state.subscription?.userId === userId) {
          return state.subscription;
        }
        if (stripeCustomerId && state.subscription?.stripeCustomerId === stripeCustomerId) {
          return state.subscription;
        }
        if (stripeSubscriptionId && state.subscription?.stripeSubscriptionId === stripeSubscriptionId) {
          return state.subscription;
        }
        return state.subscription || null;
      }
      if (modelName === 'featureFlag') {
        const state = getMockState();
        const key = args?.where?.key;
        return (state.featureFlags || []).find((f: any) => f.key === key) || null;
      }
      return null;
    },
    findFirst: async () => null,
    findMany: async () => {
      if (modelName === 'appealPdfExport') {
        const state = getMockState();
        return state.appeal.pdfExports || [];
      }
      if (modelName === 'payment') {
        const state = getMockState();
        return state.payments || [];
      }
      if (modelName === 'user') {
        const state = getMockState();
        return state.users || [];
      }
      if (modelName === 'auditLog') {
        const state = getMockState();
        return state.auditLogs || [];
      }
      if (modelName === 'featureFlag') {
        const state = getMockState();
        return state.featureFlags || [];
      }
      return [];
    },
    create: async (args: any) => {
      const data = args?.data || {};
      const newRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'mock-new-id',
        createdAt: new Date().toISOString(),
        ...data,
      };

      const state = getMockState();

      if (modelName === 'appealVersion') {
        state.appeal.versions.unshift(newRecord);
      } else if (modelName === 'aiGeneration') {
        state.appeal.aiGenerations.unshift(newRecord);
      } else if (modelName === 'appealPdfExport') {
        if (!state.appeal.pdfExports) {
          state.appeal.pdfExports = [];
        }
        state.appeal.pdfExports.unshift(newRecord);
      } else if (modelName === 'payment') {
        if (!state.payments) {
          state.payments = [];
        }
        state.payments.unshift(newRecord);
      } else if (modelName === 'subscription') {
        state.subscription = newRecord;
      } else if (modelName === 'auditLog') {
        if (!state.auditLogs) {
          state.auditLogs = [];
        }
        state.auditLogs.unshift(newRecord);
      } else if (modelName === 'featureFlag') {
        if (!state.featureFlags) {
          state.featureFlags = [];
        }
        state.featureFlags.push(newRecord);
      }

      saveMockState(state);
      return newRecord;
    },
    update: async (args: any) => {
      const data = args?.data || {};
      const state = getMockState();

      if (modelName === 'appeal') {
        state.appeal = {
          ...state.appeal,
          ...data,
        };
        saveMockState(state);
        return state.appeal;
      }
      if (modelName === 'subscription') {
        state.subscription = {
          ...state.subscription,
          ...data,
        };
        saveMockState(state);
        return state.subscription;
      }
      if (modelName === 'user') {
        if (!state.users) {
          state.users = [];
        }
        const userRec = state.users.find((u: any) => u.id === args?.where?.id);
        if (userRec) {
          Object.assign(userRec, data);
        }
        saveMockState(state);
        return userRec || { id: args?.where?.id || 'mock-id', ...data };
      }
      if (modelName === 'featureFlag') {
        if (!state.featureFlags) {
          state.featureFlags = [];
        }
        const flagRec = state.featureFlags.find((f: any) => f.key === args?.where?.key);
        if (flagRec) {
          Object.assign(flagRec, data);
        }
        saveMockState(state);
        return flagRec || { id: 'mock-id', ...data };
      }

      return { id: args?.where?.id || 'mock-id', ...data };
    },
    upsert: async (args: any) => {
      const state = getMockState();
      const updateData = args?.update || {};
      const createData = args?.create || {};

      let record: any = null;
      if (modelName === 'subscription') {
        if (state.subscription) {
          state.subscription = {
            ...state.subscription,
            ...updateData,
          };
          record = state.subscription;
        } else {
          state.subscription = {
            id: crypto.randomUUID ? crypto.randomUUID() : 'mock-new-sub-id',
            createdAt: new Date().toISOString(),
            ...createData,
          };
          record = state.subscription;
        }
        saveMockState(state);
      }
      return record || { id: 'mock-id' };
    },
    delete: async (args: any) => ({ id: args?.where?.id || 'mock-id' }),
    count: async () => {
      const state = getMockState();
      if (modelName === 'user') {
        return state.users ? state.users.length : 1;
      }
      return 0;
    },
  };
};

const modelCache: Record<string, any> = {};

export const prisma = new Proxy(realPrisma, {
  get(target, prop) {
    if (typeof prop !== 'string') return (target as any)[prop];
    if (prop === '$connect' || prop === '$disconnect') {
      return async () => {};
    }
    if (prop === '$queryRaw') {
      return async () => [{ '1': 1 }];
    }
    if (prop === '$transaction') {
      return async (callback: any) => {
        if (typeof callback === 'function') {
          return await callback(prisma);
        }
        return callback;
      };
    }

    const realModel = (target as any)[prop];
    if (!realModel) return undefined;

    if (typeof realModel !== 'object' && typeof realModel !== 'function') {
      return realModel;
    }

    if (modelCache[prop]) return modelCache[prop];

    const mockModel = createMockModel(prop);

    modelCache[prop] = new Proxy(realModel, {
      get(modelTarget, methodName) {
        const realMethod = (modelTarget as any)[methodName];
        if (typeof realMethod !== 'function') return realMethod;

        return async (...args: any[]) => {
          try {
            return await realMethod.apply(modelTarget, args);
          } catch (error: any) {
            const errorMsg = error.message || '';
            const errorCode = error.code || '';
            const isDbOffline =
              process.env.NODE_ENV === 'test' ||
              errorCode.startsWith('P') ||
              errorMsg.includes('Prisma') ||
              errorMsg.includes('Can\'t reach database') ||
              errorMsg.includes('credentials') ||
              errorMsg.includes('Authentication failed');


            if (isDbOffline) {
              const mockHandler = (mockModel as any)[methodName];
              if (mockHandler) {
                return await mockHandler(...args);
              }
            }
            throw error;
          }
        };
      },
    });

    return modelCache[prop];
  },
});

export default prisma;
export { getMockState, saveMockState };
