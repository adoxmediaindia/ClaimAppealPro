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

  // Fetch user support tickets from database
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  // Map to matching client-side interface types safely
  const initialTickets = tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    message: t.message,
    status: t.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
    createdAt: t.createdAt.toISOString(),
  }));

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

      <SupportClient initialTickets={initialTickets} />
    </div>
  );
}
