import React from 'react';
import Link from 'next/link';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Sparkles, Plus, ArrowUpRight, Activity, TrendingUp, FileSearch, ShieldCheck, ArrowRight } from 'lucide-react';

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [userData, appealsThisMonth, exportedCount, usageSum] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        subscription: true,
        appeals: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            appeals: true,
          },
        },
      },
    }),
    prisma.appeal.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.appeal.count({
      where: {
        userId: user.id,
        status: 'EXPORTED',
      },
    }),
    prisma.usageLog.aggregate({
      where: { userId: user.id },
      _sum: {
        tokenCount: true,
      },
    }),
  ]);

  const firstName = userData?.profile?.firstName || 'Valued';
  const lastName = userData?.profile?.lastName || 'Provider';
  const totalAppeals = userData?._count?.appeals || 0;
  const planTier = userData?.subscription?.planId ? userData.subscription.planId.toUpperCase() : 'FREE TRIAL';
  const subscriptionStatus = userData?.subscription?.status || 'Active';
  const activeAppealsList = userData?.appeals || [];

  const limit = planTier === 'PRO' ? 100 : 5;
  const remainingCredits = Math.max(limit - appealsThisMonth, 0);
  const totalTokensUsed = usageSum._sum.tokenCount || 0;
  const successRate = totalAppeals > 0 ? Math.round((exportedCount / totalAppeals) * 100) : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back, Dr. {firstName} {lastName}
          </h1>
          <p className="text-xs text-zinc-450 mt-1">
            Generate, customize, and export insurance denial appeal letters.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/appeals/new">
            <Button className="flex items-center space-x-2 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9">
              <Plus className="h-4 w-4 text-white" />
              <span>New Appeal</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics Overview Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Appeals Count Card */}
        <Card className="border border-white/[0.08] hover:border-white/[0.15] bg-[#14171C] transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-[#4F8CFF]/5 blur-xl group-hover:scale-150 transition-transform" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">
              Total Appeal Letters
            </CardTitle>
            <FileText className="h-4 w-4 text-[#4F8CFF]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{totalAppeals}</div>
            <p className="text-[10px] text-zinc-550 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 text-[#10B981] mr-1" />
              <span>{appealsThisMonth} generated this month</span>
            </p>
          </CardContent>
        </Card>

        {/* Remaining Credits Card */}
        <Card className="border border-white/[0.08] hover:border-white/[0.15] bg-[#14171C] transition-all group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">
              Remaining Credits
            </CardTitle>
            <Sparkles className="h-4 w-4 text-[#6EE7F9]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{remainingCredits}</div>
            <p className="text-[10px] text-zinc-550 mt-1">
              Active plan allocation: {limit} limit
            </p>
          </CardContent>
        </Card>

        {/* Success Rate Card */}
        <Card className="border border-white/[0.08] hover:border-white/[0.15] bg-[#14171C] transition-all group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">
              Export Success Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-[#10B981]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{successRate}%</div>
            <p className="text-[10px] text-zinc-550 mt-1">
              {exportedCount} out of {totalAppeals} drafts exported
            </p>
          </CardContent>
        </Card>

        {/* Subscription Status Card */}
        <Card className="border border-white/[0.08] hover:border-white/[0.15] bg-[#14171C] transition-all group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">
              Subscription Plan
            </CardTitle>
            <Activity className="h-4 w-4 text-[#6EE7F9]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white flex items-baseline space-x-2">
              <span>{planTier}</span>
              <span className="text-[9px] font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded tracking-wider uppercase">
                {subscriptionStatus}
              </span>
            </div>
            <p className="text-[10px] text-zinc-550 mt-1">
              AI Token Operations: {totalTokensUsed.toLocaleString()}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* 3. Appeals List Section */}
      <div className="grid gap-6 md:grid-cols-6">
        
        {/* Recent Appeals Card List */}
        <Card className="md:col-span-4 border border-zinc-800 bg-[#14171C]" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.05] pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
                Recent Appeals
              </CardTitle>
              <CardDescription className="text-xs text-zinc-450">
                Manage and export your recently analyzed denial letter files.
              </CardDescription>
            </div>
            <Link href="/appeals" className="text-xs text-zinc-450 hover:text-white transition-colors flex items-center space-x-1 font-semibold">
              <span>View all</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {activeAppealsList.length === 0 ? (
              
              /* Elegant empty state widget */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#101216] text-zinc-450 border border-white/[0.08]">
                  <FileSearch className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-zinc-200">No appeal letters found</h3>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    You have not uploaded any claim denial documents yet. Create one to invoke OCR/AI analysis.
                  </p>
                </div>
                <Link href="/appeals/new">
                  <Button variant="outline" size="sm" className="mt-2 border-white/[0.08] text-zinc-300">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create First Appeal
                  </Button>
                </Link>
              </div>

            ) : (
              
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/[0.08] hover:bg-transparent">
                    <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Appeal Document</TableHead>
                    <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Date Created</TableHead>
                    <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                    <TableHead className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAppealsList.map((appeal) => {
                    const meta: any = appeal.extractedMetadata || {};
                    const title = meta.patientName ? `Claim Appeal: ${meta.patientName}` : `Appeal Reference #${appeal.id.slice(0, 8)}`;
                    const isSuccess = appeal.status === 'READY' || appeal.status === 'GENERATED';
                    
                    return (
                      <TableRow key={appeal.id} className="border-b border-white/[0.08] hover:bg-white/[0.02]">
                        <TableCell className="font-semibold text-zinc-200 text-xs">
                          {title}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs">
                          {new Date(appeal.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isSuccess ? 'success' : 'secondary'}>
                            {appeal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/appeals/${appeal.id}`}>
                            <Button variant="outline" size="sm" className="border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.04]">
                              Open
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 4. Quick Actions Panel */}
        <Card className="md:col-span-2 border border-white/[0.08] bg-[#14171C]">
          <CardHeader className="border-b border-white/[0.05] pb-4">
            <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
              Quick Resources
            </CardTitle>
            <CardDescription className="text-xs text-zinc-450">
              Useful tools and documentation links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-md border border-white/[0.06] bg-[#08090B]/40 p-4 hover:border-white/[0.12] transition-colors">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-[#4F8CFF]" />
                <h4 className="text-xs font-semibold text-zinc-200">HIPAA & SOC 2 Safeguards</h4>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                All data is encrypted in transit and at rest using banking-grade security gates.
              </p>
            </div>
            
            <div className="rounded-md border border-white/[0.06] bg-[#08090B]/40 p-4 hover:border-white/[0.12] transition-colors">
              <h4 className="text-xs font-semibold text-zinc-200">Need Help appealing claims?</h4>
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                Open a ticket to speak directly to clinical coding specialists.
              </p>
              <Link href="/support" className="inline-flex items-center text-[10px] text-[#4F8CFF] font-semibold mt-3 hover:underline space-x-1">
                <span>Contact support</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
