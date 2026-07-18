'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loginUser } from '@/app/actions/auth';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const rememberMe = formData.get('rememberMe') === 'on';

    startTransition(async () => {
      const res = await loginUser({ email, password, rememberMe });
      if (res.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(res.error?.message || 'Invalid email or password.');
      }
    });

  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 px-4">
      <Card className="w-full max-w-md border border-zinc-800 bg-zinc-950">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-xl font-bold text-zinc-150">Welcome back</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Sign in to your ClaimAppealPro account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-455">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 text-xs rounded border border-zinc-800 bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-[10px] text-zinc-400 hover:text-zinc-200">
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 text-xs rounded border border-zinc-800 bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-zinc-400 focus:ring-0"
              />
              <label htmlFor="rememberMe" className="text-[11px] text-zinc-400">Remember me for 30 days</label>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-850" />
            </div>
            <span className="relative px-3 bg-zinc-950 text-[10px] text-zinc-500 uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          <a
            href="/api/v1/auth/callback?provider=google"
            className="flex w-full items-center justify-center space-x-2 rounded-md border border-zinc-850 bg-zinc-900 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <span>Sign in with Google</span>
          </a>

          <p className="text-[10px] text-center text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-zinc-400 hover:underline">
              Create an account
            </Link>
          </p>

        </CardContent>
      </Card>
    </div>
  );
}
