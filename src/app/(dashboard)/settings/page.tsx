import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import SettingsForm from './SettingsForm';

export const revalidate = 0; // Enforce fresh database fetches

export default async function SettingsPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile safely from database
  let profile = null;
  let isDbError = false;
  try {
    profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });
  } catch (err) {
    console.error('Failed to fetch user profile in settings:', err);
    isDbError = true;
  }

  const initialProfile = {
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    clinicName: profile?.clinicName || '',
    npiNumber: profile?.npiNumber || '',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Account Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Customize your profile, clinical configurations, and NPI identifiers.
        </p>
      </div>

      {isDbError && (
        <div className="p-4 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-400 font-semibold">
          ⚠️ Database connection issue: Profile details could not be loaded from database. Settings are read-only.
        </div>
      )}

      <SettingsForm initialProfile={initialProfile} />
    </div>
  );
}
