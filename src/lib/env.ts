import { z } from 'zod';
import log from './logger';

const coreEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection URL string.').optional().or(z.literal('')),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.').optional().or(z.literal('')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')),
});

const optionalEnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  APP_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).optional(),
});

export function validateEnvironment() {
  // During tests, bypass validation checks if running local mocks
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const coreResult = coreEnvSchema.safeParse(process.env);
  if (!coreResult.success) {
    log.warn(
      { errors: coreResult.error.format() },
      'Core environment validation warning.'
    );
  } else {
    log.info({}, 'Core environment variables validated successfully.');
  }

  // Validate optional services status for logging only
  const optResult = optionalEnvSchema.safeParse(process.env);
  const activeProviders: string[] = [];
  if (optResult.success) {
    const data = optResult.data;
    if (data.OPENAI_API_KEY) activeProviders.push('OpenAI');
    if (data.GEMINI_API_KEY) activeProviders.push('Gemini');
    if (data.ANTHROPIC_API_KEY) activeProviders.push('Anthropic');
    if (data.STRIPE_SECRET_KEY) activeProviders.push('Stripe');
    if (data.RAZORPAY_KEY_ID) activeProviders.push('Razorpay');
    if (data.PAYPAL_CLIENT_ID) activeProviders.push('PayPal');
    if (data.RESEND_API_KEY) activeProviders.push('Resend');
    if (data.MISTRAL_API_KEY) activeProviders.push('Mistral');
  }

  log.info(
    { activeProviders },
    `Environment verified. Active optional integrations: [${activeProviders.join(', ') || 'None (Core mode)'}]`
  );
}
