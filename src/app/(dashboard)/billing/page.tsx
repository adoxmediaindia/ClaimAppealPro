import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import BillingClient from './BillingClient';

export default async function BillingPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch subscription info
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  // Fetch invoice payment history
  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Billing & Subscription</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your subscription plans, payment methods, and invoices.
        </p>
      </div>

      <BillingClient 
        initialSubscription={subscription}
        initialPayments={payments}
        userEmail={user.email || 'user@example.com'}
      />
    </div>
  );
}
