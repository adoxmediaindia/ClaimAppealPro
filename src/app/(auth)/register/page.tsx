'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signUpUser } from '@/app/actions/auth';
import Link from 'next/link';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Validate password constraints client side to match strict password policy
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Basic format checks for E2E tests
    let hasError = false;
    if (!email.includes('@')) {
      setEmailError('Must be a valid email address');
      hasError = true;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      hasError = true;
    }
    if (hasError) {
      return;
    }

    startTransition(async () => {
      const res = await signUpUser({ email, password, firstName: 'User', lastName: 'Member' });
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error?.message || 'Failed to create account.');
      }
    });

  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 px-4">
      <Card className="w-full max-w-md border border-zinc-800 bg-zinc-950">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-xl font-bold text-zinc-150">Create an account</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Start automating claim denial appeal letters today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-455">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 text-xs rounded border border-emerald-900 bg-emerald-955/20 text-emerald-450 space-y-2">
              <p className="font-semibold">Registration successful!</p>
              <p>We&apos;ve sent a verification email to your address. Please verify your email before logging in.</p>
            </div>
          )}


          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-zinc-800 bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                {emailError && <p className="text-[10px] text-rose-455 mt-1">{emailError}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-zinc-800 bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                {passwordError && <p className="text-[10px] text-rose-455 mt-1">{passwordError}</p>}
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? 'Creating account...' : 'Register'}
              </Button>
            </form>
          )}

          <p className="text-[10px] text-center text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-zinc-400 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
