'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth';
import { requestPasswordReset } from '@/app/actions/auth';
import Link from 'next/link';
import { Activity } from 'lucide-react';

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
    <main className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#08090B] text-zinc-150">
      
      {/* Brand Logo header */}
      <div className="flex items-center space-x-2 mb-8">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-[#4F8CFF] to-[#6EE7F9] p-2 flex items-center justify-center shadow-lg shadow-[#4F8CFF]/15">
          <Activity className="h-5 w-5 text-black" />
        </div>
        <span className="font-extrabold text-sm tracking-tight text-white">
          ClaimAppeal<span className="text-zinc-550 font-medium">Pro</span>
        </span>
      </div>

      <div className="w-full max-w-md p-8 space-y-6 rounded-lg border border-white/[0.08] bg-[#14171C] shadow-2xl relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4F8CFF] to-[#6EE7F9] rounded-t-lg" />
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Forgot Password</h1>
          <p className="text-xs text-zinc-450">
            Enter your email to receive a secure password reset link.
          </p>
        </div>

        {success ? (
          <div className="p-4 rounded-md border border-emerald-900 bg-[#064E3B]/20 text-[#10B981] text-xs">
            If the email is registered, a password reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-450 animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                placeholder="you@provider.com"
                disabled={isPending}
              />
              {errors.email && (
                <p className="text-[10px] text-rose-455 mt-1">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 text-xs font-bold rounded bg-[#4F8CFF] text-white hover:bg-[#4F8CFF]/90 transition-colors disabled:opacity-50 h-9"
            >
              {isPending ? 'Sending request...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link href="/login" className="text-xs text-zinc-450 hover:text-white transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
