'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loginUser } from '@/app/actions/auth';
import Link from 'next/link';
import { Activity, Shield, KeyRound } from 'lucide-react';

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
    <div className="min-h-screen bg-[#08090B] flex flex-col md:flex-row">
      
      {/* Left side: Premium Security Branding Panel */}
      <div className="hidden md:flex md:w-1/2 bg-[#101216]/50 border-r border-white/[0.08] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
        
        {/* Branding header */}
        <div className="flex items-center space-x-2 relative z-10">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-[#4F8CFF] to-[#6EE7F9] p-2 flex items-center justify-center shadow-lg shadow-[#4F8CFF]/15">
            <Activity className="h-5 w-5 text-black" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            ClaimAppeal<span className="text-zinc-550 font-medium">Pro</span>
          </span>
        </div>

        {/* Security content */}
        <div className="space-y-6 relative z-10 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
            HIPAA Compliant Clinical <br />
            Appeal Operations
          </h2>
          <p className="text-xs text-zinc-450 leading-relaxed">
            Secure billing workflows built to support NPI certification, patient medical records extraction, and insurer guidelines compliance seamlessly.
          </p>

          <div className="space-y-3.5 pt-4">
            <div className="flex items-start space-x-3 text-xs">
              <Shield className="h-4.5 w-4.5 text-[#4F8CFF] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-zinc-200">Strict Transport Security</h4>
                <p className="text-zinc-500 text-[11px] mt-0.5">AES-256 data encryption and secure SSL socket pools.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 text-xs">
              <KeyRound className="h-4.5 w-4.5 text-[#6EE7F9] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-zinc-200">HIPAA & SOC 2 Safeguards</h4>
                <p className="text-zinc-500 text-[11px] mt-0.5">Compliance gates isolate patient identity records securely.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer citation */}
        <div className="text-[10px] text-zinc-500 relative z-10">
          &copy; {new Date().getFullYear()} ClaimAppealPro. Security verified.
        </div>
      </div>

      {/* Right side: Clean Minimalist Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md border border-white/[0.08] bg-[#14171C] shadow-2xl relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4F8CFF] to-[#6EE7F9] rounded-t-lg" />
          
          <CardHeader className="text-center space-y-1.5 pt-8">
            <CardTitle className="text-2xl font-bold text-white tracking-tight">Welcome back</CardTitle>
            <CardDescription className="text-xs text-zinc-450">
              Sign in to your ClaimAppealPro provider dashboard.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-450 animate-in fade-in duration-200">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@provider.com"
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Password</label>
                  <Link href="/forgot-password" className="text-[10px] text-zinc-400 hover:text-white transition-colors">
                    Forgot Password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                />
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-white/[0.08] bg-[#08090B] text-[#4F8CFF] focus:ring-0 checked:bg-[#4F8CFF] cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-[11px] text-zinc-400 select-none cursor-pointer">Remember me for 30 days</label>
              </div>

              <Button type="submit" disabled={isPending} className="w-full bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9">
                {isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <span className="relative px-3 bg-[#14171C] text-[10px] text-zinc-500 uppercase tracking-wider">
                Or continue with
              </span>
            </div>

            <a
              href="/api/v1/auth/callback?provider=google"
              className="flex w-full items-center justify-center space-x-2 rounded-md border border-white/[0.08] bg-[#101216] py-2.5 text-xs text-zinc-350 hover:bg-[#101216]/80 hover:text-white transition-colors"
            >
              <span>Sign in with Google</span>
            </a>

            <p className="text-[10px] text-center text-zinc-550 pt-2">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#4F8CFF] hover:underline font-semibold">
                Create an account
              </Link>
            </p>

          </CardContent>
        </Card>
      </div>

    </div>
  );
}
