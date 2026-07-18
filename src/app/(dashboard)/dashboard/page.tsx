import React from 'react';
import Link from 'next/link';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Sparkles, Plus, ArrowUpRight, Activity, TrendingUp, FileSearch } from 'lucide-react';

export const revalidate = 0; // Disable static cache to enforce fresh database fetches

export default async function DashboardPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch complete profile, appeals list, and subscription parameters in a single query
  const userData = await prisma.user.findUnique({
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
  });

  const firstName = userData?.profile?.firstName || 'Valued';
  const lastName = userData?.profile?.lastName || 'Provider';
  const totalAppeals = userData?._count?.appeals || 0;
  const planTier = userData?.subscription?.planId ? userData.subscription.planId.toUpperCase() : 'FREE TRIAL';
  const subscriptionStatus = userData?.subscription?.status || 'Active';

  // Calculate active drafts and ready-to-export states
  const activeAppealsList = userData?.appeals || [];

  return (
    <div className="space-y-8">
      
      {/* 1. Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Welcome back, Dr. {firstName} {lastName}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generate, customize, and export insurance denial appeal letters.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/appeals/new">
            <Button className="flex items-center space-x-2 shadow-lg shadow-zinc-950/40">
              <Plus className="h-4 w-4 text-zinc-950" />
              <span className="font-semibold text-zinc-950">New Appeal</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics Overview Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Appeals Count Card */}
        <Card className="border-zinc-800 hover:border-zinc-700 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-zinc-800/10 blur-xl group-hover:scale-150 transition-transform" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total Appeal Letters
            </CardTitle>
            <FileText className="h-4.5 w-4.5 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-100">{totalAppeals}</div>
            <p className="text-[11px] text-zinc-500 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 text-emerald-450 mr-1" />
              <span>All-time insurance appeal drafts</span>
            </p>
          </CardContent>
        </Card>

        {/* Subscription Status Card */}
        <Card className="border-zinc-800 hover:border-zinc-700 transition-all group relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Subscription Plan
            </CardTitle>
            <Activity className="h-4.5 w-4.5 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-100 flex items-baseline space-x-2">
              <span>{planTier}</span>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                {subscriptionStatus}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Provides up to 5 generations per month
            </p>
          </CardContent>
        </Card>

        {/* AI Processing Usage Card */}
        <Card className="border-zinc-800 hover:border-zinc-700 transition-all group relative overflow-hidden md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              AI Token Operations
            </CardTitle>
            <Sparkles className="h-4.5 w-4.5 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-100">AI Enabled</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              GPT-4o document analysis is active
            </p>
          </CardContent>
        </Card>


      </div>

      {/* 3. Appeals List Section */}
      <div className="grid gap-6 md:grid-cols-6">
        
        {/* Recent Appeals Card List */}
        <Card className="md:col-span-4 border border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/40 pb-4">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-100">
                Recent Appeals
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Manage and export your recently analyzed denial letter files.
              </CardDescription>
            </div>
            <Link href="/appeals" className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors flex items-center space-x-1">
              <span>View all</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {activeAppealsList.length === 0 ? (
              
              /* Elegant empty state widget */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-850/50 text-zinc-400 border border-zinc-900">

                  <FileSearch className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-200">No appeal letters found</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    You have not uploaded any claim denial documents yet. Create one to invoke OCR/AI analysis.
                  </p>
                </div>
                <Link href="/appeals/new">
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create First Appeal
                  </Button>
                </Link>
              </div>

            ) : (
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Appeal Document</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAppealsList.map((appeal) => {
                    const meta: any = appeal.extractedMetadata || {};
                    const title = meta.patientName ? `Claim Appeal: ${meta.patientName}` : `Appeal Reference #${appeal.id.slice(0, 8)}`;
                    
                    return (
                      <TableRow key={appeal.id}>
                        <TableCell className="font-medium text-zinc-200">
                          {title}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs">
                          {new Date(appeal.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={appeal.status === 'READY' || appeal.status === 'GENERATED' ? 'success' : 'secondary'}>
                            {appeal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/appeals/${appeal.id}`}>
                            <Button variant="outline" size="sm">
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
        <Card className="md:col-span-2 border border-zinc-900">
          <CardHeader className="border-b border-zinc-800/40 pb-4">
            <CardTitle className="text-base font-semibold text-zinc-100">
              Quick Resources
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Useful tools and documentation links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-md border border-zinc-900 p-3 hover:bg-zinc-900/40 transition-colors">
              <h4 className="text-xs font-semibold text-zinc-200">HIPAA & SOC 2 Compliance</h4>
              <p className="text-[10px] text-zinc-400 mt-1">
                All data is encrypted in transit and at rest. Personal identifiable information (PII) is isolated.
              </p>
            </div>
            <div className="rounded-md border border-zinc-900 p-3 hover:bg-zinc-900/40 transition-colors">
              <h4 className="text-xs font-semibold text-zinc-200">Need Help Appeal Support?</h4>
              <p className="text-[10px] text-zinc-400 mt-1">
                Open a ticket to speak directly to billing or technical support operations teams.
              </p>
              <Link href="/support" className="inline-block text-[10px] text-zinc-300 underline mt-2 hover:text-zinc-100">
                Open support ticket
              </Link>
            </div>
          </CardContent>
        </Card>


      </div>

    </div>
  );
}
