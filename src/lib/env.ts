import { z } from 'zod';
import log from './logger';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection URL string.'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be populated.'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, 'SUPABASE_SERVICE_ROLE_KEY must be populated.'),
  OPENAI_API_KEY: z.string().min(5, 'OPENAI_API_KEY must be populated.'),
  STRIPE_SECRET_KEY: z.string().min(5, 'STRIPE_SECRET_KEY must be populated.'),
  STRIPE_WEBHOOK_SECRET: z.string().min(5, 'STRIPE_WEBHOOK_SECRET must be populated.'),
  RESEND_API_KEY: z.string().min(5, 'RESEND_API_KEY must be populated.'),
});

export function validateEnvironment() {
  // During tests, bypass validation checks if running local mocks
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    log.error(
      {},
      'Environment validation failure. Server startup blocked.',
      result.error.format()
    );
    throw new Error(
      `CRITICAL: Environment validation failed:\n` +
      JSON.stringify(result.error.format(), null, 2)
    );
  }

  log.info({}, 'Environment verified successfully. All systems nominal.');
}
