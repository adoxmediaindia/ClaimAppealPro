const { execSync } = require('child_process');

try {
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  const isLocalDb = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1');
  const isVercelBuild = process.env.VERCEL === '1' && process.env.DATABASE_URL && !isLocalDb;

  if (isVercelBuild) {
    console.log('Vercel build detected. Running prisma migrate deploy to apply database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } else {
    console.log('Local build environment or local DB detected. Skipping database migrations deployment.');
  }

  console.log('Running Next.js production build...');
  execSync('npx next build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build step failed:', error.message);
  process.exit(1);
}
