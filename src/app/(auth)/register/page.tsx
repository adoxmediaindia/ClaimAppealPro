'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signUpUser } from '@/app/actions/auth';
import Link from 'next/link';
import { Activity, Shield, KeyRound } from 'lucide-react';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const fullName = (formData.get('fullName') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const clinicName = (formData.get('clinicName') as string || '').trim();

    const errors: Record<string, string> = {};

    if (!fullName) {
      errors.fullName = 'Full name is required.';
    }
    if (!phone) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\+?[0-9\s\-()]{7,25}$/.test(phone)) {
      errors.phone = 'Must be a valid phone number.';
    }
    if (!email.includes('@')) {
      errors.email = 'Must be a valid email address.';
    }
    
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must contain at least one lowercase letter.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number.';
    } else if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.password = 'Password must contain at least one special character.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const res = await signUpUser({ email, password, confirmPassword, fullName, phone, clinicName });
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error?.message || 'Failed to create account.');
        if (res.error?.details) {
          const detailErrors: Record<string, string> = {};
          Object.entries(res.error.details).forEach(([key, val]) => {
            if (Array.isArray(val) && val[0]) {
              detailErrors[key] = val[0];
            }
          });
          setFieldErrors(detailErrors);
        }
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
          <p className="text-xs text-zinc-455 leading-relaxed">
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

      {/* Right side: Clean Minimalist Sign Up Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <Card className="w-full max-w-md border border-white/[0.08] bg-[#14171C] shadow-2xl relative my-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4F8CFF] to-[#6EE7F9] rounded-t-lg" />
          
          <CardHeader className="text-center space-y-1.5 pt-8">
            <CardTitle className="text-2xl font-bold text-white tracking-tight">Create an account</CardTitle>
            <CardDescription className="text-xs text-zinc-455">
              Start automating claim denial appeal letters today.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-450 animate-in fade-in duration-200">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 text-xs rounded border border-emerald-900 bg-[#064E3B]/20 text-[#10B981] space-y-2 animate-in fade-in duration-200">
                <p className="font-semibold">Registration successful!</p>
                <p>We&apos;ve sent a verification email to your address. Please verify your email before logging in.</p>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Full Name *</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    placeholder="John Smith"
                    className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  />
                  {fieldErrors.fullName && <p className="text-[10px] text-rose-450 mt-1">{fieldErrors.fullName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Phone Number *</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+1 555-555-5555"
                    className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  />
                  {fieldErrors.phone && <p className="text-[10px] text-rose-450 mt-1">{fieldErrors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Email Address *</label>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    placeholder="name@provider.com"
                    className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  />
                  {fieldErrors.email && <p className="text-[10px] text-rose-450 mt-1">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="clinicName" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Practice / Clinic Name (Optional)</label>
                  <input
                    id="clinicName"
                    name="clinicName"
                    type="text"
                    placeholder="e.g. Hope Medical Clinic"
                    className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Password *</label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[10px] font-bold uppercase"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-[10px] text-rose-450 mt-1">{fieldErrors.password}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Confirm Password *</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  />
                  {fieldErrors.confirmPassword && <p className="text-[10px] text-rose-450 mt-1">{fieldErrors.confirmPassword}</p>}
                </div>

                <Button type="submit" disabled={isPending} className="w-full bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9">
                  {isPending ? 'Creating account...' : 'Register'}
                </Button>
              </form>
            )}

            <p className="text-[10px] text-center text-zinc-550 pt-2">
              Already have an account?{' '}
              <Link href="/login" className="text-[#4F8CFF] hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
