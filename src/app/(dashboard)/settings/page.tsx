import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Account Settings</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Customize your profile, clinical configurations, and NPI identifiers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Profile Settings form card placeholder */}
        <Card className="border border-zinc-800 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Clinic & Provider Details</CardTitle>
            <CardDescription className="text-xs">These values populate your generated letters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Clinic Name</label>
                <input
                  type="text"
                  placeholder="e.g. Hope Medical Clinic"
                  className="w-full px-3 py-1.5 text-xs rounded border border-zinc-800 bg-zinc-950 text-zinc-300 placeholder-zinc-650 focus:outline-none"
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">NPI Number</label>
                <input
                  type="text"
                  placeholder="10-digit identifier"
                  className="w-full px-3 py-1.5 text-xs rounded border border-zinc-800 bg-zinc-950 text-zinc-300 placeholder-zinc-650 focus:outline-none"
                  disabled
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button size="sm" variant="outline" disabled>Save Changes</Button>
          </CardFooter>
        </Card>

        {/* Security Controls card */}
        <Card className="border border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Account Security</CardTitle>
            <CardDescription className="text-xs">Manage authentication and password states.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex items-center space-x-3 rounded bg-zinc-950/40 p-3 border border-zinc-850">
              <ShieldCheck className="h-5 w-5 text-emerald-450 shrink-0" />
              <div>
                <h4 className="text-[11px] font-semibold text-zinc-200">Password is set</h4>
                <p className="text-[9px] text-zinc-500">Security audits passed.</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
