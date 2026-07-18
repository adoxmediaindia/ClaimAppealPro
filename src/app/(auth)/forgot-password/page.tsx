'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';
import { requestPasswordReset } from '@/app/actions/auth';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const response = await requestPasswordReset(data);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error?.message || 'Failed to submit password reset request.');
      }
    });
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md p-8 space-y-6 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Forgot Password</h1>
          <p className="text-sm text-zinc-400">
            Enter your email to receive a secure password reset link.
          </p>
        </div>

        {success ? (
          <div className="p-4 rounded-md border border-emerald-800 bg-emerald-950/30 text-emerald-400 text-sm">
            If the email is registered, a password reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm rounded border border-rose-900 bg-rose-950/30 text-rose-400">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 text-sm rounded border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                placeholder="you@example.com"
                disabled={isPending}
              />
              {errors.email && (
                <p className="text-xs text-rose-400">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 text-sm font-semibold rounded bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Sending request...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
