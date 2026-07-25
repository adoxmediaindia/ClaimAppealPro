const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Parse .env manually to load current local environment values
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
  console.warn('Failed to parse .env file:', e);
}

async function runInspection() {
  console.log('--- STARTING DATABASE INSPECTION ---');
  const url = process.env.DATABASE_URL || '';
  if (!url) {
    console.error('Error: DATABASE_URL is not defined in the environment.');
    return;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  });

  try {
    const dbNameResult = await prisma.$queryRaw`SELECT current_database() as db_name`;
    const dbName = dbNameResult[0]?.db_name || 'N/A';
    console.log(`Database Name: ${dbName}`);

    const schemaResult = await prisma.$queryRaw`SELECT current_schema() as schema_name`;
    const schemaName = schemaResult[0]?.schema_name || 'N/A';
    console.log(`Current Schema: ${schemaName}`);

    console.log('Fetching public tables list...');
    const tablesList = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ${schemaName} 
      AND table_type = 'BASE TABLE'
    `;

    console.log('Tables Found:');
    if (tablesList.length === 0) {
      console.log('  (No tables found in public schema)');
    } else {
      tablesList.forEach((t) => {
        console.log(`  - ${t.table_name}`);
      });
    }

  } catch (err) {
    console.error('Database connection/query execution failed:', err.message || err);
  } finally {
    await prisma.$disconnect();
    console.log('--- INSPECTION COMPLETED ---');
  }
}

runInspection();
