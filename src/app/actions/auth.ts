'use server';

import { signUpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, type SignUpInput, type LoginInput, type ForgotPasswordInput, type ResetPasswordInput } from '@/lib/validations/auth';
import { createServerSideClient, createAdminClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import config from '@/config';
import { sendWelcomeEmail, sendVerificationEmail } from '@/lib/email/templates';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

function normalizePhone(phone: string): string {
  const cleaned = phone.trim();
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Translates Supabase auth errors to friendly user-facing messages.
 */
function getFriendlyAuthError(authError: { code?: string; message: string }): string {
  const code = authError.code?.toLowerCase() || '';
  const message = authError.message.toLowerCase();

  if (code === 'signup_disabled') {
    return 'Registration is currently disabled.';
  }
  if (code === 'email_limit_exceeded' || message.includes('rate limit') || message.includes('too many requests')) {
    return 'Verification email rate limit exceeded. Please try again in a few minutes.';
  }
  if (code === 'user_already_exists' || message.includes('already registered') || message.includes('already exists') || message.includes('email_exists')) {
    return 'This email is already registered. Please sign in.';
  }
  if (code === 'invalid_credentials' || message.includes('invalid credentials')) {
    return 'Invalid email address or incorrect password.';
  }
  if (code === 'weak_password' || message.includes('weak password') || message.includes('should be at least')) {
    return 'Password is too weak. Please use a stronger password.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'A network failure occurred. Please check your internet connection and try again.';
  }
  if (message.includes('database') || message.includes('server error') || message.includes('unavailable')) {
    return 'The authentication service is temporarily unavailable. Please try again later.';
  }

  return 'Registration failed. Please verify your details and try again.';
}

/**
 * Translates Prisma DB errors to friendly user-facing messages.
 */
function getFriendlyDbError(error: any): string {
  const code = error?.code;
  if (code === 'P2002') {
    return 'This email is already registered. Please sign in.';
  }
  if (code === 'P2025') {
    return 'The requested record was not found.';
  }
  return 'A database error occurred while processing your request. Please try again later.';
}

/**
 * Registers a new user account with Supabase Auth and creates corresponding DB records.
 */
export async function signUpUser(input: SignUpInput): Promise<ActionResponse<{ email: string; requiresVerification: boolean }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, email: input.email }, 'User registration attempt started');

  try {
    // 1. Validate request inputs
    const result = signUpSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([key, val]) => {
        if (val) fieldErrors[key] = val;
      });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for registration input.',
          details: fieldErrors,
        },
      };
    }

    const { email, password, fullName, phone, clinicName } = result.data;
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const normalizedPhone = normalizePhone(phone);

    // 2. Check if email already exists in public database (Prisma check)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      log.warn({ correlationId, email }, 'Registration failed: email already exists in public schema');
      return {
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'This email is already registered. Please sign in.',
        },
      };
    }

    // 3. Generate Link via Supabase Admin Client (creates user in Supabase Auth securely without SMTP rate-limits)
    const adminClient = createAdminClient();
    log.info({ correlationId, email }, 'Logging: Before generateLink');
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: `${config.APP_URL}/api/v1/auth/callback?next=/dashboard`,
      },
    });
    log.info({
      correlationId,
      email,
      linkError: linkError ? { code: linkError.code, message: linkError.message } : null
    }, 'Logging: After generateLink');

    if (linkError) {
      log.error({ correlationId, email, errorCode: linkError.code }, 'Supabase auth registration failed', linkError);
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: getFriendlyAuthError(linkError),
        },
      };
    }

    const supabaseUser = linkData.user;
    const actionLink = linkData.properties?.action_link;

    if (!supabaseUser || !actionLink) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed. Verification link could not be generated.',
        },
      };
    }

    log.info({ correlationId, userId: supabaseUser.id, email }, 'Supabase Auth user created and link generated');

    // 4. Create User and Profile in Prisma inside transaction
    try {
      log.info({ correlationId, userId: supabaseUser.id }, 'Logging: Before Prisma transaction');
      await prisma.$transaction(async (tx) => {
        log.info({ correlationId, userId: supabaseUser.id }, 'Logging: Before User upsert');
        const publicUser = await tx.user.upsert({
          where: { id: supabaseUser.id },
          update: { email },
          create: {
            id: supabaseUser.id,
            email,
            role: 'USER',
          },
        });
        log.info({ correlationId, userId: supabaseUser.id, publicUserId: publicUser.id }, 'Logging: After User upsert');

        await tx.profile.upsert({
          where: { userId: publicUser.id },
          update: {
            firstName,
            lastName,
            phone: normalizedPhone,
            clinicName: clinicName || null,
          },
          create: {
            userId: publicUser.id,
            firstName,
            lastName,
            phone: normalizedPhone,
            clinicName: clinicName || null,
          },
        });
      });
      log.info({ correlationId, userId: supabaseUser.id }, 'Logging: After Prisma transaction');
    } catch (dbError: any) {
      log.error({
        correlationId,
        userId: supabaseUser.id,
        prismaErrorCode: dbError?.code || 'N/A',
        prismaErrorMeta: dbError?.meta || null
      }, 'Prisma transaction failed. Rolling back Supabase Auth user.', dbError);
      
      // Rollback: Delete the newly created user in Supabase Auth to prevent orphan accounts
      try {
        await adminClient.auth.admin.deleteUser(supabaseUser.id);
        log.info({ correlationId, userId: supabaseUser.id }, 'Supabase Auth user rolled back successfully');
      } catch (rollbackErr: any) {
        log.error({ correlationId, userId: supabaseUser.id, error: rollbackErr.message }, 'Failed to rollback/delete Supabase user');
      }

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: getFriendlyDbError(dbError),
        },
      };
    }

    // 5. Send verification email via Resend
    try {
      const emailSent = await sendVerificationEmail(email, actionLink);
      if (!emailSent) {
        log.error({ correlationId, email }, 'Resend failed to send verification email');
      }
    } catch (emailErr: any) {
      log.error({ correlationId, email, error: emailErr.message }, 'Resend verification email dispatch threw an exception');
    }

    // 6. Send welcome email (non-blocking)
    sendWelcomeEmail(email, firstName).catch((err) => {
      log.error({ correlationId, error: err.message }, 'Failed to dispatch welcome email');
    });

    return {
      success: true,
      data: {
        email,
        requiresVerification: true,
      },
    };
  } catch (error: any) {
    log.error({ correlationId }, 'Unexpected registration error', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    };
  }
}

/**
 * Authenticates user credentials with Supabase Auth, managing session lifecycle.
 */
export async function loginUser(input: LoginInput): Promise<ActionResponse<{ email: string; role: string }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, email: input.email }, 'User login attempt started');

  try {
    const result = loginSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([key, val]) => {
        if (val) fieldErrors[key] = val;
      });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for login inputs.',
          details: fieldErrors,
        },
      };
    }

    const { email, password } = result.data;
    const supabase = await createServerSideClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      log.warn(
        { correlationId, email, errorCode: authError.code, errorMsg: authError.message },
        'Authentication failure: incorrect credentials or verification required'
      );
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email, incorrect password, or unverified account.',
        },
      };
    }

    const supabaseUser = authData.user;
    if (!supabaseUser) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Login succeeded but user object was not found.',
        },
      };
    }

    if (!supabaseUser.email_confirmed_at) {
      log.warn({ correlationId, userId: supabaseUser.id, email }, 'Login blocked: email is not verified');
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email, incorrect password, or unverified account.',
        },
      };
    }

    let dbUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: { role: true },
    });

    if (!dbUser) {
      log.info({ correlationId, userId: supabaseUser.id, email }, 'Prisma user record missing during login. Synchronizing...');
      try {
        dbUser = await prisma.$transaction(async (tx) => {
          const publicUser = await tx.user.create({
            data: {
              id: supabaseUser.id,
              email: supabaseUser.email || email,
              role: 'USER',
            },
          });
          const userMetadata = supabaseUser.user_metadata || {};
          const metaFirstName = userMetadata.given_name || userMetadata.firstName || null;
          const metaLastName = userMetadata.family_name || userMetadata.lastName || null;

          await tx.profile.create({
            data: {
              userId: publicUser.id,
              firstName: metaFirstName,
              lastName: metaLastName,
            },
          });
          return publicUser;
        });
      } catch (syncErr: any) {
        log.error({ correlationId, userId: supabaseUser.id, error: syncErr.message }, 'Failed to auto-synchronize missing user on login');
      }
    }

    const userRole = dbUser?.role || 'USER';

    await prisma.auditLog.create({
      data: {
        userId: dbUser ? supabaseUser.id : null,
        action: 'LOGIN_SUCCESS',
        details: { email: supabaseUser.email || email },
      },
    });

    log.info({ correlationId, userId: supabaseUser.id, role: userRole }, 'User login completed successfully');

    return {
      success: true,
      data: {
        email: supabaseUser.email || email,
        role: userRole,
      },
    };
  } catch (error: any) {
    log.error({ correlationId }, 'Unexpected login error occurred', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during login. Please try again.',
      },
    };
  }
}

/**
 * Sign out user and clears the JWT authentication cookie.
 */
export async function logoutUser(): Promise<ActionResponse<void>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'User logout initiated');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error: authError } = await supabase.auth.signOut();
    if (authError) {
      log.error({ correlationId, userId: user?.id }, 'Supabase auth session termination failed', authError);
      return {
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed. Please try again.',
        },
      };
    }

    log.info({ correlationId, userId: user?.id }, 'User session terminated and cookies purged');

    return {
      success: true,
    };
  } catch (error: any) {
    log.error({ correlationId }, 'Unexpected logout error occurred', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during logout.',
      },
    };
  }
}

/**
 * Requests a password reset email using Supabase.
 * Returns a generic success response to prevent email enumeration.
 */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResponse<void>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, email: input.email }, 'Password reset request initiated');

  try {
    const result = forgotPasswordSchema.safeParse(input);
    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for reset request input.',
          details: {
            email: result.error.flatten().fieldErrors.email || [],
          },
        },
      };
    }

    const { email } = result.data;
    const adminClient = createAdminClient();

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${config.APP_URL}/api/v1/auth/callback?next=/reset-password`,
      },
    });

    if (linkError) {
      log.warn(
        { correlationId, email, errorCode: linkError.code, error: linkError },
        'Supabase password reset link generation failed'
      );
    } else if (linkData?.properties?.action_link) {
      const actionLink = linkData.properties.action_link;
      const { sendPasswordResetEmail } = await import('@/lib/email/templates');
      await sendPasswordResetEmail(email, actionLink);
    }

    log.info({ correlationId, email }, 'Password reset email triggered successfully (generic response returned)');

    return {
      success: true,
    };
  } catch (error: any) {
    log.error({ correlationId }, 'Unexpected error during password reset request', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      },
    };
  }
}

/**
 * Updates the authenticated user's password and invalidates all active sessions.
 */
export async function updatePasswordAfterReset(input: ResetPasswordInput): Promise<ActionResponse<void>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'User password update after reset started');

  try {
    const result = resetPasswordSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([key, val]) => {
        if (val) fieldErrors[key] = val;
      });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for password reset input.',
          details: fieldErrors,
        },
      };
    }

    const { password } = result.data;
    const supabase = await createServerSideClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      log.warn({ correlationId }, 'Password update blocked: reset session invalid or expired');
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Password reset link is invalid or has expired.',
        },
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      log.error({ correlationId, userId: user.id, errorCode: updateError.code }, 'Supabase password update failed', updateError);
      return {
        success: false,
        error: {
          code: 'PASSWORD_UPDATE_FAILED',
          message: getFriendlyAuthError(updateError),
        },
      };
    }

    log.info({ correlationId, userId: user.id }, 'Password updated successfully. Initiating global logout scope');

    await supabase.auth.signOut({ scope: 'global' });

    return {
      success: true,
    };
  } catch (error: any) {
    log.error({ correlationId }, 'Unexpected error during password update', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    };
  }
}

/**
 * Initiates Google OAuth registration/login flow and returns the authorization URL.
 */
export async function signInWithGoogle(): Promise<ActionResponse<{ url: string }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'Google OAuth sign-in flow initiated');

  try {
    const supabase = await createServerSideClient();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${config.APP_URL}/api/v1/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      log.error({ correlationId, errorCode: error.code }, 'Supabase Google OAuth initiation failed', error);
      return {
        success: false,
        error: {
          code: 'OAUTH_INITIATION_FAILED',
          message: 'Failed to initiate Google sign-in. Please try again.',
        },
      };
    }

    if (!data.url) {
      return {
        success: false,
        error: {
          code: 'OAUTH_REDIRECT_MISSING',
          message: 'Google sign-in redirect URL was not returned by auth service.',
        },
      };
    }

    log.info({ correlationId }, 'OAuth redirect URL retrieved successfully');

    return {
      success: true,
      data: {
        url: data.url,
      },
    };
  } catch (error: any) {
    log.error({ correlationId }, 'Unexpected error initiating Google OAuth flow', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    };
  }
}
