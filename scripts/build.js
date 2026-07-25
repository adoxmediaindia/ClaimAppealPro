const { execSync } = require('child_process');

try {
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  const isVercelBuild = process.env.VERCEL === '1' && process.env.DATABASE_URL;

  if (isVercelBuild) {
    console.log('Vercel build detected. Running prisma db push to synchronize database schema...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  } else {
    console.log('Local build environment. Skipping database schema push.');
  }

  console.log('Running Next.js production build...');
  execSync('npx next build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build step failed:', error.message);
  process.exit(1);
}
