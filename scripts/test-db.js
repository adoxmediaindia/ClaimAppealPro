const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Parse .env manually
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {
  console.warn('Failed to parse .env:', e);
}

async function runDiagnostics() {
  console.log('--- STARTING DATABASE DIAGNOSTICS ---');
  const url = process.env.DATABASE_URL || '';
  if (!url) {
    console.error('Error: DATABASE_URL is not set.');
    console.log('DATABASE CONNECTION: FAIL');
    return;
  }
  const sanitizedUrl = url.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to: ${sanitizedUrl}`);

  const prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  });

  let connectionPassed = false;
  let schemaPassed = false;

  try {
    await prismaClient.$queryRaw`SELECT 1`;
    connectionPassed = true;
    console.log('DATABASE CONNECTION: PASS');
  } catch (err) {
    console.error('DATABASE CONNECTION failed:', err.message || err);
    console.log('DATABASE CONNECTION: FAIL');
  }

  if (connectionPassed) {
    try {
      await prismaClient.user.findFirst();
      schemaPassed = true;
      console.log('SCHEMA: PASS');
    } catch (err) {
      console.error('SCHEMA check failed:', err.message || err);
      console.log('SCHEMA: FAIL');
    }
  } else {
    console.log('SCHEMA: FAIL (Skipped)');
  }

  if (schemaPassed) {
    try {
      const userCount = await prismaClient.user.count();
      console.log(`User count: ${userCount}`);
      console.log('USER QUERY: PASS');
    } catch (err) {
      console.error('USER QUERY failed:', err.message || err);
      console.log('USER QUERY: FAIL');
    }

    try {
      const appealCount = await prismaClient.appeal.count();
      console.log(`Appeal count: ${appealCount}`);
      console.log('APPEAL QUERY: PASS');
    } catch (err) {
      console.error('APPEAL QUERY failed:', err.message || err);
      console.log('APPEAL QUERY: FAIL');
    }

    try {
      const auditLogCount = await prismaClient.auditLog.count();
      console.log(`AuditLog count: ${auditLogCount}`);
      console.log('AUDIT LOG QUERY: PASS');
    } catch (err) {
      console.error('AUDIT LOG QUERY failed:', err.message || err);
      console.log('AUDIT LOG QUERY: FAIL');
    }

    try {
      const notificationCount = await prismaClient.notification.count();
      console.log(`Notification count: ${notificationCount}`);
      console.log('NOTIFICATION QUERY: PASS');
    } catch (err) {
      console.error('NOTIFICATION QUERY failed:', err.message || err);
      console.log('NOTIFICATION QUERY: FAIL');
    }
  } else {
    console.log('USER QUERY: FAIL');
    console.log('APPEAL QUERY: FAIL');
    console.log('AUDIT LOG QUERY: FAIL');
    console.log('NOTIFICATION QUERY: FAIL');
  }

  await prismaClient.$disconnect();
  console.log('--- DIAGNOSTICS COMPLETED ---');
}

runDiagnostics();
