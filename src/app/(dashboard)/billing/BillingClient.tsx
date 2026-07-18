'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, CheckCircle2, Calendar, ShieldAlert, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { createCheckoutSessionAction, createCustomerPortalAction } from '@/app/actions/billing';
import { SUBSCRIPTION_PLANS } from '@/lib/billing/plans';

interface BillingClientProps {
  initialSubscription: any;
  initialPayments: any[];
  userEmail: string;
}

export default function BillingClient({ initialSubscription, initialPayments, userEmail }: BillingClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const payments = initialPayments;

  const activePlanId = initialSubscription?.status === 'active' ? initialSubscription.planId : 'free';
  const isPro = activePlanId === 'pro';

  const handleUpgrade = async () => {
    setLoading('upgrade');
    setError(null);
    try {
      const res = await createCheckoutSessionAction('price_pro_subscription');
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res.error?.message || 'Upgrade checkout initiation failed.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading('portal');
    setError(null);
    try {
      const res = await createCustomerPortalAction();
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res.error?.message || 'Could not load customer billing portal.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center space-x-2 rounded-lg border border-red-900 bg-red-950/40 p-4 text-xs text-red-400">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Active Plan Details + Plan Upgrades */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Active plan status */}
        <Card className="border border-zinc-800 bg-zinc-900/60 md:col-span-2 shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl rounded-full" />
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-zinc-100 text-lg font-bold tracking-tight">Active Subscription</CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-0.5">Your active account level and capabilities</CardDescription>
              </div>
              <Badge variant={isPro ? 'success' : 'secondary'} className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {isPro ? 'Pro Active' : 'Free Tier'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4 rounded-lg bg-zinc-950/80 p-5 border border-zinc-850">
              <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800">
                <CreditCard className={`h-6 w-6 ${isPro ? 'text-emerald-450' : 'text-zinc-500'}`} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  {isPro ? SUBSCRIPTION_PLANS.pro.name : SUBSCRIPTION_PLANS.free.name}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {isPro 
                    ? `100 generated appeals per month. Reset date: ${new Date(initialSubscription?.currentPeriodEnd).toLocaleDateString()}.`
                    : '5 generated appeals per month allocation. Upgrade to remove restrictions.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg bg-zinc-950/40 p-3 border border-zinc-850/50">
                <span className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">Billing Account</span>
                <div className="mt-1 font-semibold text-zinc-300 truncate">
                  {userEmail}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-950/40 p-3 border border-zinc-850/50">
                <span className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">
                  {isPro ? 'Renewal Date' : 'Reset Cycle'}
                </span>
                <div className="flex items-center space-x-1.5 mt-1 font-semibold text-zinc-300 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>
                    {isPro 
                      ? new Date(initialSubscription?.currentPeriodEnd).toLocaleDateString()
                      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center bg-zinc-950/30 px-6 py-4 border-t border-zinc-850/40">
            <span className="text-[11px] text-zinc-500">
              {isPro 
                ? (initialSubscription?.cancelAtPeriodEnd ? 'Subscription will cancel at end of period' : 'Auto-renews automatically')
                : 'Upgrade below to unlock Professional Pro features'}
            </span>
            {isPro ? (
              <Button size="sm" onClick={handleManageBilling} disabled={loading !== null} className="text-xs">
                {loading === 'portal' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Connecting...
                  </>
                ) : (
                  'Manage Billing'
                )}
              </Button>
            ) : (
              <Button size="sm" onClick={handleUpgrade} disabled={loading !== null} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                {loading === 'upgrade' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Processing...
                  </>
                ) : (
                  <>
                    Upgrade to Pro
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Features card */}
        <Card className="border border-zinc-800 bg-zinc-900/60 shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-2xl rounded-full" />
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4.5 w-4.5 text-violet-400" />
              <CardTitle className="text-zinc-100 text-sm font-semibold tracking-tight">Pro Plan Features</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">Unlock complete document automation capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {SUBSCRIPTION_PLANS.pro.features.map((feature) => (
              <div key={feature} className="flex items-start space-x-2 text-xs text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-450 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* Invoice payment history list */}
      <Card className="border border-zinc-800 bg-zinc-900/60 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-zinc-100 text-base font-bold tracking-tight">Invoice History</CardTitle>
          <CardDescription className="text-xs text-zinc-400 mt-0.5">Chronological record of subscription payments made to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              No payments processed.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/40">
              <Table>
                <TableHeader className="bg-zinc-950">
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Amount</TableHead>
                    <TableHead className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Reference ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="border-zinc-850 hover:bg-zinc-900/40 transition-colors">
                      <TableCell className="text-xs text-zinc-300 font-mono">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-zinc-200">
                        ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold">
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-zinc-500 font-mono">
                        {payment.stripeSessionId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
