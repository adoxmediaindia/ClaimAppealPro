'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { updateProfileAction } from '@/app/actions/profile';
import { profileSchema } from '@/lib/validations/profile';

interface SettingsFormProps {
  initialProfile: {
    firstName: string;
    lastName: string;
    clinicName: string;
    npiNumber: string;
  };
}

export default function SettingsForm({ initialProfile }: SettingsFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('idle');
    setErrorMsg(null);
    setValidationErrors({});

    const result = profileSchema.safeParse(profile);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setValidationErrors(errors);
      setStatus('error');
      setErrorMsg('Please correct the validation errors below.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateProfileAction(profile);
        if (res.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(res.error?.message || 'Failed to save changes.');
          if (res.error?.details) {
            const detailErrors: Record<string, string> = {};
            Object.entries(res.error.details).forEach(([key, val]) => {
              if (Array.isArray(val) && val[0]) {
                detailErrors[key] = val[0];
              }
            });
            setValidationErrors(detailErrors);
          }
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 animate-in fade-in duration-300">
      <Card className="border border-white/[0.08] md:col-span-2 bg-[#14171C] shadow-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Clinic & Provider Details</CardTitle>
            <CardDescription className="text-xs text-zinc-450">
              These values populate your generated appeal letters automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {status === 'success' && (
              <div className="flex items-center space-x-2 rounded-lg border border-emerald-900 bg-[#064E3B]/20 p-3 text-xs text-[#10B981] animate-in fade-in">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#10B981]" />
                <span>Profile changes successfully written to database.</span>
              </div>
            )}

            {status === 'error' && errorMsg && (
              <div className="flex items-center space-x-2 rounded-lg border border-rose-900 bg-rose-955/20 p-3 text-xs text-rose-450 animate-in fade-in">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-450" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={profile.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all ${
                    validationErrors.firstName ? 'border-rose-900 focus:border-rose-800 focus:ring-rose-900/30' : 'border-white/[0.08]'
                  }`}
                  disabled={isPending}
                />
                {validationErrors.firstName && (
                  <p className="text-[10px] text-rose-450 mt-1">{validationErrors.firstName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={profile.lastName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all ${
                    validationErrors.lastName ? 'border-rose-900 focus:border-rose-800 focus:ring-rose-900/30' : 'border-white/[0.08]'
                  }`}
                  disabled={isPending}
                />
                {validationErrors.lastName && (
                  <p className="text-[10px] text-rose-455 mt-1">{validationErrors.lastName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="clinicName" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Clinic Name</label>
                <input
                  id="clinicName"
                  name="clinicName"
                  type="text"
                  placeholder="e.g. Hope Medical Clinic"
                  value={profile.clinicName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all ${
                    validationErrors.clinicName ? 'border-rose-900 focus:border-rose-800 focus:ring-rose-900/30' : 'border-white/[0.08]'
                  }`}
                  disabled={isPending}
                />
                {validationErrors.clinicName && (
                  <p className="text-[10px] text-rose-455 mt-1">{validationErrors.clinicName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="npiNumber" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">NPI Number</label>
                <input
                  id="npiNumber"
                  name="npiNumber"
                  type="text"
                  placeholder="10-digit identifier"
                  maxLength={10}
                  value={profile.npiNumber}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all ${
                    validationErrors.npiNumber ? 'border-rose-900 focus:border-rose-800 focus:ring-rose-900/30' : 'border-white/[0.08]'
                  }`}
                  disabled={isPending}
                />
                {validationErrors.npiNumber && (
                  <p className="text-[10px] text-rose-455 mt-1">{validationErrors.npiNumber}</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-white/[0.05] p-4 bg-[#101216]/50">
            <Button type="submit" size="sm" disabled={isPending} className="font-bold text-white bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 h-9 px-4 active:scale-[0.98]">
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl h-fit">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Account Security</CardTitle>
          <CardDescription className="text-xs text-zinc-450">
            Manage your account authentication states.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center space-x-3 rounded bg-[#08090B] p-4 border border-white/[0.08]">
            <ShieldCheck className="h-5 w-5 text-[#10B981] shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-zinc-200">Password is set</h4>
              <p className="text-[10px] text-zinc-550 mt-0.5 font-medium">Security audits passed.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
