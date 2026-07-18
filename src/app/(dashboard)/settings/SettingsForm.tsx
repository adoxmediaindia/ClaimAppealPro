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
    // Clear validation error when typing
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

    // Validate inputs client-side first
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
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="border border-zinc-800 md:col-span-2 bg-zinc-900/40 backdrop-blur-sm shadow-xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base font-bold text-zinc-100 tracking-tight">Clinic & Provider Details</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              These values populate your generated appeal letters automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {status === 'success' && (
              <div className="flex items-center space-x-2 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-xs text-emerald-400 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
                <span>Profile changes successfully written to database.</span>
              </div>
            )}

            {status === 'error' && errorMsg && (
              <div className="flex items-center space-x-2 rounded-lg border border-rose-900 bg-rose-955/20 p-3 text-xs text-rose-455 animate-in fade-in duration-200">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="firstName" className="text-xs font-semibold text-zinc-400">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={profile.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-1.5 text-xs rounded border bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                    validationErrors.firstName ? 'border-rose-900' : 'border-zinc-800'
                  }`}
                />
                {validationErrors.firstName && (
                  <p className="text-[10px] text-rose-455">{validationErrors.firstName}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="lastName" className="text-xs font-semibold text-zinc-400">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={profile.lastName}
                  onChange={handleChange}
                  className={`w-full px-3 py-1.5 text-xs rounded border bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                    validationErrors.lastName ? 'border-rose-900' : 'border-zinc-800'
                  }`}
                />
                {validationErrors.lastName && (
                  <p className="text-[10px] text-rose-455">{validationErrors.lastName}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="clinicName" className="text-xs font-semibold text-zinc-400">Clinic Name</label>
                <input
                  id="clinicName"
                  name="clinicName"
                  type="text"
                  placeholder="e.g. Hope Medical Clinic"
                  value={profile.clinicName}
                  onChange={handleChange}
                  className={`w-full px-3 py-1.5 text-xs rounded border bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                    validationErrors.clinicName ? 'border-rose-900' : 'border-zinc-800'
                  }`}
                />
                {validationErrors.clinicName && (
                  <p className="text-[10px] text-rose-455">{validationErrors.clinicName}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="npiNumber" className="text-xs font-semibold text-zinc-400">NPI Number</label>
                <input
                  id="npiNumber"
                  name="npiNumber"
                  type="text"
                  placeholder="10-digit identifier"
                  maxLength={10}
                  value={profile.npiNumber}
                  onChange={handleChange}
                  className={`w-full px-3 py-1.5 text-xs rounded border bg-zinc-950 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                    validationErrors.npiNumber ? 'border-rose-900' : 'border-zinc-800'
                  }`}
                />
                {validationErrors.npiNumber && (
                  <p className="text-[10px] text-rose-455">{validationErrors.npiNumber}</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-zinc-800/40 pt-4">
            <Button type="submit" size="sm" disabled={isPending} className="font-semibold text-zinc-950">
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

      <Card className="border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm shadow-xl h-fit">
        <CardHeader>
          <CardTitle className="text-base font-bold text-zinc-100 tracking-tight">Account Security</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Manage your account authentication states.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center space-x-3 rounded bg-zinc-950/40 p-4 border border-zinc-850">
            <ShieldCheck className="h-5 w-5 text-emerald-450 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-zinc-200">Password is set</h4>
              <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Security audits passed.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
