import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  PAYPAL_CLIENT_ID: z.string().optional().default(''),
  PAYPAL_CLIENT_SECRET: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  MISTRAL_API_KEY: z.string().optional().default(''),
  APP_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
});

const getEnv = () => {
  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    APP_URL: process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    console.warn('⚠️ Application configuration warning:', result.error.format());
    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
      RESEND_API_KEY: process.env.RESEND_API_KEY || '',
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
      APP_URL: process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    };
  }

  return result.data;
};

export const config = getEnv();

export type Config = typeof config;
export default config;
