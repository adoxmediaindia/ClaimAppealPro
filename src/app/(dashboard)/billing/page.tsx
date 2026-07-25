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

  // Fetch subscription and payment history safely
  let subscription = null;
  let payments: any[] = [];
  let isDbError = false;

  try {
    subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
  } catch (err) {
    console.error('Failed to fetch subscription in billing page:', err);
    isDbError = true;
  }

  try {
    payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('Failed to fetch payments in billing page:', err);
    isDbError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Billing & Subscription</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your subscription plans, payment methods, and invoices.
        </p>
      </div>

      {isDbError && (
        <div className="p-4 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-400 font-semibold">
          ⚠️ Database connection issue: Subscription details and invoices are temporarily unavailable.
        </div>
      )}

      <BillingClient 
        initialSubscription={subscription}
        initialPayments={payments}
        userEmail={user.email || 'user@example.com'}
      />
    </div>
  );
}
