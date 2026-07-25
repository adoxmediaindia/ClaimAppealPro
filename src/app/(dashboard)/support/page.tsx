import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import SupportClient from './SupportClient';
import { HelpCircle } from 'lucide-react';

export const revalidate = 0; // Enforce fresh database fetches

export default async function SupportPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user support tickets safely from database
  let initialTickets: any[] = [];
  let isDbError = false;
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    initialTickets = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
      createdAt: t.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error('Failed to fetch support tickets in page:', err);
    isDbError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          <HelpCircle className="h-6 w-6 text-zinc-100 mr-2 shrink-0" />
          <span>Help & Support</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Open support tickets or consult platform technical documentation.
        </p>
      </div>

      {isDbError && (
        <div className="p-4 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-450 font-semibold animate-pulse">
          ⚠️ Database connection issue: Support history is currently offline. You can still open new support messages.
        </div>
      )}

      <SupportClient initialTickets={initialTickets} />
    </div>
  );
}
