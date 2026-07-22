const { execSync } = require('child_process');

try {
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Sync schema to DB if on Vercel or database URL points to a remote Supabase host
  const isRemoteDb = process.env.DATABASE_URL && (
    process.env.DATABASE_URL.includes('supabase.co') || 
    process.env.DATABASE_URL.includes('supabase.com') ||
    process.env.DATABASE_URL.includes('pooler.supabase.com')
  );

  if (process.env.VERCEL || isRemoteDb) {
    console.log('Remote/Vercel environment detected. Running prisma db push...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  } else {
    console.log('Local database environment. Skipping online db push.');
  }

  console.log('Running Next.js production build...');
  execSync('npx next build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build step failed:', error.message);
  process.exit(1);
}
