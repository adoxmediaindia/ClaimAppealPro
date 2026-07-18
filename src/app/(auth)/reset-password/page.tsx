'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth';
import { updatePasswordAfterReset } from '@/app/actions/auth';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = (data: ResetPasswordInput) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const response = await updatePasswordAfterReset(data);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error?.message || 'Failed to update password.');
      }
    });
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md p-8 space-y-6 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-zinc-400">
            Create a strong new password for your account.
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-md border border-emerald-800 bg-emerald-950/30 text-emerald-400 text-sm">
              Your password has been successfully reset, and other sessions have been terminated.
            </div>
            <Link
              href="/login"
              className="block w-full py-2.5 text-center text-sm font-semibold rounded bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm rounded border border-rose-900 bg-rose-950/30 text-rose-400">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                New Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full px-3 py-2 text-sm rounded border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                placeholder="••••••••"
                disabled={isPending}
              />
              {errors.password && (
                <p className="text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className="w-full px-3 py-2 text-sm rounded border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                placeholder="••••••••"
                disabled={isPending}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-rose-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 text-sm font-semibold rounded bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Updating password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
