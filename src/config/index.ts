import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection URL.' }),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL.' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, { message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is too short.' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, { message: 'SUPABASE_SERVICE_ROLE_KEY is required.' }),
  OPENAI_API_KEY: z.string().min(1, { message: 'OPENAI_API_KEY is required for document generation.' }),
  STRIPE_SECRET_KEY: z.string().min(1, { message: 'STRIPE_SECRET_KEY is required for payments.' }),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, { message: 'STRIPE_WEBHOOK_SECRET is required to verify hooks.' }),
  RESEND_API_KEY: z.string().min(1, { message: 'RESEND_API_KEY is required for email services.' }),
  MISTRAL_API_KEY: z.string().min(1, { message: 'MISTRAL_API_KEY is required for OCR.' }).optional().or(z.literal('')),
  APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
});

const getEnv = () => {
  const isTest = process.env.NODE_ENV === 'test';

  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL || (isTest ? 'postgresql://localhost:5432/mock' : undefined),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || (isTest ? 'https://mock.supabase.co' : undefined),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isTest ? 'mock-anon-key-long-value' : undefined),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || (isTest ? 'mock-service-role-key-long' : undefined),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || (isTest ? 'mock-openai-key' : undefined),
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || (isTest ? 'mock-stripe-key' : undefined),
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || (isTest ? 'mock-stripe-webhook' : undefined),
    RESEND_API_KEY: process.env.RESEND_API_KEY || (isTest ? 'mock-resend-key' : undefined),
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || (isTest ? 'mock-mistral-key' : undefined),
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  });


  if (!result.success) {
    console.error('❌ Invalid application configuration:', result.error.format());
    throw new Error('Invalid environment variables. Fix configurations before launching.');
  }

  return result.data;
};

export const config = getEnv();

export type Config = typeof config;
export default config;
