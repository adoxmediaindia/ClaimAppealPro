import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, ShieldAlert, FileText, Sparkles, CreditCard, User, LogIn, LogOut } from 'lucide-react';

export const revalidate = 0;

export default async function ActivityHistoryPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all audit logs for the current user
  const logs = await prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const getLogIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'SIGN_IN':
        return <LogIn className="h-4 w-4 text-emerald-450" />;
      case 'LOGOUT':
      case 'SIGN_OUT':
        return <LogOut className="h-4 w-4 text-rose-450" />;
      case 'GENERATE_AI_APPEAL':
      case 'APPEAL_VERSION_SAVED':
      case 'AI_USED':
        return <Sparkles className="h-4 w-4 text-sky-450" />;
      case 'APPEAL_CREATED':
      case 'APPEAL_EDITED':
      case 'APPEAL_DELETED':
      case 'FILE_OCR_PROCESS_COMPLETE':
        return <FileText className="h-4 w-4 text-[#4F8CFF]" />;
      case 'PADDLE_CHECKOUT_COMPLETED':
      case 'PADDLE_INVOICE_PAID':
      case 'BILLING_PORTAL_OPENED':
      case 'SUBSCRIPTION_PURCHASED':
        return <CreditCard className="h-4 w-4 text-[#6EE7F9]" />;
      case 'PROFILE_UPDATED':
      case 'REGISTER':
        return <User className="h-4 w-4 text-purple-450" />;
      default:
        return <Activity className="h-4 w-4 text-zinc-450" />;
    }
  };

  const getFriendlyActionName = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Activity className="h-6 w-6 text-[#4F8CFF]" />
          <span>Activity History</span>
        </h1>
        <p className="text-xs text-zinc-450 mt-1">
          Detailed audit logs of account events, billing updates, and AI actions.
        </p>
      </div>

      <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Account Audit Trails</CardTitle>
          <CardDescription className="text-xs text-zinc-450">
            Displays up to 50 most recent security and feature actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101216] text-zinc-550 border border-white/[0.08]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-semibold text-zinc-200">No activity logged</h3>
              <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                Security and generation events will be displayed here as you use the application.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/[0.08] hover:bg-transparent">
                  <TableHead className="w-12 text-zinc-400 font-bold uppercase tracking-wider text-[10px]"></TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Action</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Details</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const detailsString = log.details ? JSON.stringify(log.details) : 'N/A';
                  return (
                    <TableRow key={log.id} className="border-b border-white/[0.08] hover:bg-white/[0.02]">
                      <TableCell className="py-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-[#101216] border border-white/[0.08]">
                          {getLogIcon(log.action)}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-zinc-200 text-xs py-3">
                        {getFriendlyActionName(log.action)}
                      </TableCell>
                      <TableCell className="text-zinc-450 text-xs font-mono max-w-[200px] sm:max-w-md truncate py-3" title={detailsString}>
                        {detailsString}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-xs text-right py-3 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
