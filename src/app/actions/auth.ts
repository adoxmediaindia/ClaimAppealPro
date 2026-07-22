'use server';

import { signUpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, type SignUpInput, type LoginInput, type ForgotPasswordInput, type ResetPasswordInput } from '@/lib/validations/auth';
import { createServerSideClient } from '@/lib/supabase';
import { ValidationError, ApiError, DatabaseError, UnauthorizedError } from '@/lib/errors';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import config from '@/config';
import { sendWelcomeEmail } from '@/lib/email/templates';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Registers a new user account with Supabase Auth and creates corresponding DB records.
 */
export async function signUpUser(input: SignUpInput): Promise<ActionResponse<{ email: string; requiresVerification: boolean }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, email: input.email }, 'User registration attempt started');

  try {
    const result = signUpSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([key, val]) => {
        if (val) fieldErrors[key] = val;
      });
      throw new ValidationError('Validation failed for registration input.', fieldErrors);
    }

    const { email, password, firstName, lastName, clinicName, npiNumber } = result.data;
    const supabase = await createServerSideClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          role: 'USER',
        },
      },
    });

    if (authError) {
      log.error({ correlationId, email, errorCode: authError.code }, 'Supabase auth registration failed', authError);
      throw new ApiError(400, 'REGISTRATION_FAILED', authError.message);
    }

    const supabaseUser = authData.user;
    if (!supabaseUser) {
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'User creation succeeded but user object was not returned.');
    }

    log.info({ correlationId, userId: supabaseUser.id, email }, 'Supabase Auth registration succeeded');

    try {
      await prisma.$transaction(async (tx) => {
        const publicUser = await tx.user.upsert({
          where: { id: supabaseUser.id },
          update: { email },
          create: {
            id: supabaseUser.id,
            email,
            role: 'USER',
          },
        });

        await tx.profile.upsert({
          where: { userId: publicUser.id },
          update: {
            firstName,
            lastName,
            clinicName: clinicName || null,
            npiNumber: npiNumber || null,
          },
          create: {
            userId: publicUser.id,
            firstName,
            lastName,
            clinicName: clinicName || null,
            npiNumber: npiNumber || null,
          },
        });
      });
      log.info({ correlationId, userId: supabaseUser.id }, 'Public schema synchronized successfully via Prisma transaction');

      // Send welcome email (non-blocking)
      sendWelcomeEmail(email, firstName).catch((err) => {
        log.error({ correlationId, error: err.message }, 'Failed to dispatch welcome email');
      });
    } catch (dbError) {
      log.error({ correlationId, userId: supabaseUser.id }, 'Prisma synchronization failed during registration', dbError);
      throw new DatabaseError(dbError);
    }

    return {
      success: true,
      data: {
        email,
        requiresVerification: true,
      },
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ApiError || error instanceof DatabaseError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      };
    }

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
      throw new ValidationError('Validation failed for login inputs.', fieldErrors);
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
      throw new UnauthorizedError('Invalid email, incorrect password, or unverified account.');
    }

    const supabaseUser = authData.user;
    if (!supabaseUser) {
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Login succeeded but user object was not found.');
    }

    if (!supabaseUser.email_confirmed_at) {
      log.warn({ correlationId, userId: supabaseUser.id, email }, 'Login blocked: email is not verified');
      await supabase.auth.signOut();
      throw new UnauthorizedError('Invalid email, incorrect password, or unverified account.');
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: { role: true },
    });

    const userRole = dbUser?.role || 'USER';

    log.info({ correlationId, userId: supabaseUser.id, role: userRole }, 'User login completed successfully');

    return {
      success: true,
      data: {
        email: supabaseUser.email || email,
        role: userRole,
      },
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ApiError || error instanceof DatabaseError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      };
    }

    log.error({ correlationId }, 'Unexpected login error occurred', error);
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
      throw new ApiError(500, 'LOGOUT_FAILED', authError.message);
    }

    log.info({ correlationId, userId: user?.id }, 'User session terminated and cookies purged');

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      };
    }

    log.error({ correlationId }, 'Unexpected logout error occurred', error);
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
 * Requests a password reset email using Supabase.
 * Returns a generic success response to prevent email enumeration.
 */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResponse<void>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, email: input.email }, 'Password reset request initiated');

  try {
    const result = forgotPasswordSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Validation failed for reset request input.', {
        email: result.error.flatten().fieldErrors.email || [],
      });
    }

    const { email } = result.data;
    const supabase = await createServerSideClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.APP_URL}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      log.warn(
        { correlationId, email, errorCode: resetError.code, error: resetError },
        'Supabase password reset request trigger failed'
      );
    }

    log.info({ correlationId, email }, 'Password reset email triggered successfully (generic response returned)');

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      };
    }

    log.error({ correlationId }, 'Unexpected error during password reset request', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
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
      throw new ValidationError('Validation failed for password reset input.', fieldErrors);
    }

    const { password } = result.data;
    const supabase = await createServerSideClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      log.warn({ correlationId }, 'Password update blocked: reset session invalid or expired');
      throw new UnauthorizedError('Password reset link is invalid or has expired.');
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      log.error({ correlationId, userId: user.id, errorCode: updateError.code }, 'Supabase password update failed', updateError);
      throw new ApiError(400, 'PASSWORD_UPDATE_FAILED', updateError.message);
    }

    log.info({ correlationId, userId: user.id }, 'Password updated successfully. Initiating global logout scope');

    await supabase.auth.signOut({ scope: 'global' });

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      };
    }

    log.error({ correlationId }, 'Unexpected error during password update', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
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
      throw new ApiError(400, 'OAUTH_INITIATION_FAILED', error.message);
    }

    if (!data.url) {
      throw new ApiError(500, 'OAUTH_REDIRECT_MISSING', 'Supabase OAuth URL was not generated.');
    }

    log.info({ correlationId }, 'OAuth redirect URL retrieved successfully');

    return {
      success: true,
      data: {
        url: data.url,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      };
    }

    log.error({ correlationId }, 'Unexpected error initiating Google OAuth flow', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    };
  }
}
