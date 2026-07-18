import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import config from '@/config';

/**
 * Handles the OAuth provider redirect code exchange and idempotent user profile upserting.
 */
export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  log.info({ correlationId, next }, 'OAuth callback handler invoked');

  if (!code) {
    log.warn({ correlationId }, 'OAuth callback failed: authorization code is missing');
    return NextResponse.redirect(`${config.APP_URL}/login?error=OAUTH_MISSING_CODE`);
  }

  try {
    const supabase = await createServerSideClient();
    
    // Exchange OAuth code for secure session cookies
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      log.error({ correlationId, errorCode: exchangeError.code }, 'Supabase OAuth session exchange failed', exchangeError);
      return NextResponse.redirect(`${config.APP_URL}/login?error=OAUTH_EXCHANGE_FAILED`);
    }

    const supabaseUser = sessionData.user;
    if (!supabaseUser) {
      log.error({ correlationId }, 'Supabase OAuth exchange completed but user object is empty');
      return NextResponse.redirect(`${config.APP_URL}/login?error=OAUTH_USER_NOT_FOUND`);
    }

    const email = supabaseUser.email;
    if (!email) {
      log.error({ correlationId, userId: supabaseUser.id }, 'Supabase OAuth returned user without email address');
      return NextResponse.redirect(`${config.APP_URL}/login?error=OAUTH_EMAIL_MISSING`);
    }

    // Parse user profile fields from Google user_metadata metadata
    const userMetadata = supabaseUser.user_metadata || {};
    const firstName = userMetadata.given_name || userMetadata.firstName || 'OAuth';
    const lastName = userMetadata.family_name || userMetadata.lastName || 'User';

    log.info({ correlationId, userId: supabaseUser.id, email }, 'OAuth session established. Synchronizing DB profile...');

    // Idempotently upsert public tables
    try {
      await prisma.$transaction(async (tx) => {
        // Upsert User
        const publicUser = await tx.user.upsert({
          where: { id: supabaseUser.id },
          update: { email },
          create: {
            id: supabaseUser.id,
            email,
            role: 'USER',
          },
        });

        // Upsert Profile
        await tx.profile.upsert({
          where: { userId: publicUser.id },
          update: {
            firstName,
            lastName,
          },
          create: {
            userId: publicUser.id,
            firstName,
            lastName,
          },
        });

        // Log OAuth Audit event
        await tx.auditLog.create({
          data: {
            userId: publicUser.id,
            action: 'AUTH_OAUTH_SIGNIN',
            ipAddress: request.headers.get('x-forwarded-for') || null,
            userAgent: request.headers.get('user-agent') || null,
            details: { provider: 'google' },
          },
        });
      });
      log.info({ correlationId, userId: supabaseUser.id }, 'Prisma synchronization and audit logging completed for OAuth user');
    } catch (dbError) {
      log.error({ correlationId, userId: supabaseUser.id }, 'Database synchronization failed during OAuth callback', dbError);
      // We do not crash the login if synchronization fails but log it as critical, 
      // since the user is authenticated in Supabase. The session recovery hook in middleware will auto-recover it.
    }

    // 4. Secure redirect check to prevent Open Redirect vulnerabilities
    let safeRedirectUrl = '/dashboard';
    if (next.startsWith('/') && !next.startsWith('//')) {
      safeRedirectUrl = next;
    } else {
      log.warn({ correlationId, next }, 'Malicious or invalid redirect URL filtered (Open Redirect Prevention)');
    }

    return NextResponse.redirect(`${config.APP_URL}${safeRedirectUrl}`);
  } catch (error) {
    log.error({ correlationId }, 'Unexpected exception caught in OAuth callback API route', error);
    return NextResponse.redirect(`${config.APP_URL}/login?error=INTERNAL_SERVER_ERROR`);
  }
}
