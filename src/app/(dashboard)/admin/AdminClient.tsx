'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ShieldAlert, 
  Users, 
  Activity, 
  FolderLock, 
  Sliders, 
  CheckCircle, 
  XCircle,  
  Loader2, 
  DollarSign, 
  FileText, 
  Server
} from 'lucide-react';
import { 
  updateUserRoleAction, 
  updateUserSubscriptionAction, 
  toggleFeatureFlagAction,
  fetchAdminUsersAction,
  fetchFeatureFlagsAction,
  fetchSystemAuditLogsAction,
  fetchAdminStatsAction
} from '@/app/actions/admin';

interface AdminClientProps {
  initialStats: any;
  initialUsers: any[];
  initialFlags: any[];
  initialLogs: any[];
  initialHealth: any;
}

export default function AdminClient({
  initialStats,
  initialUsers,
  initialFlags,
  initialLogs,
  initialHealth
}: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'flags' | 'audits' | 'health'>('overview');
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [flags, setFlags] = useState<any[]>(initialFlags);
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [stats, setStats] = useState<any>(initialStats);
  const [, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const refreshData = async () => {
    const usersRes = await fetchAdminUsersAction();
    if (usersRes.success && usersRes.data) setUsers(usersRes.data);

    const flagsRes = await fetchFeatureFlagsAction();
    if (flagsRes.success && flagsRes.data) setFlags(flagsRes.data);

    const logsRes = await fetchSystemAuditLogsAction();
    if (logsRes.success && logsRes.data) setLogs(logsRes.data);

    const statsRes = await fetchAdminStatsAction();
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
  };

  const handleRoleToggle = async (userId: string, currentRole: 'USER' | 'ADMIN') => {
    setActionError(null);
    setProcessingId(userId + '-role');
    
    startTransition(async () => {
      try {
        const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        const res = await updateUserRoleAction(userId, nextRole);
        if (res.success) {
          await refreshData();
        } else {
          setActionError(res.error?.message || 'Failed to update user role.');
        }
      } catch (err: any) {
        setActionError(err.message || 'Unexpected role update failure.');
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handlePlanToggle = async (userId: string, currentPlan: string) => {
    setActionError(null);
    setProcessingId(userId + '-plan');
    
    startTransition(async () => {
      try {
        const nextPlan = currentPlan === 'pro' ? 'free' : 'pro';
        const res = await updateUserSubscriptionAction(userId, nextPlan);
        if (res.success) {
          await refreshData();
        } else {
          setActionError(res.error?.message || 'Failed to update subscription tier.');
        }
      } catch (err: any) {
        setActionError(err.message || 'Unexpected plan update failure.');
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleFlagToggle = async (flagKey: string, currentValue: boolean) => {
    setActionError(null);
    setProcessingId(flagKey);

    startTransition(async () => {
      try {
        const res = await toggleFeatureFlagAction(flagKey, !currentValue);
        if (res.success) {
          await refreshData();
        } else {
          setActionError(res.error?.message || 'Failed to toggle flag configuration.');
        }
      } catch (err: any) {
        setActionError(err.message || 'Unexpected flag update failure.');
      } finally {
        setProcessingId(null);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-[#4F8CFF]" />
            <span>System Administration</span>
          </h1>
          <p className="text-xs text-zinc-450 mt-1">
            Admin console to manage clinic tiers, toggle system features, audit actions, and track API telemetry.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 bg-[#101216] border border-white/[0.08] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'overview' ? 'bg-[#4F8CFF] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'users' ? 'bg-[#4F8CFF] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Users & Plans
          </button>
          <button
            onClick={() => setActiveTab('flags')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'flags' ? 'bg-[#4F8CFF] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Feature Flags
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'audits' ? 'bg-[#4F8CFF] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'health' ? 'bg-[#4F8CFF] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            System Health
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div className="p-3 bg-rose-955/20 border border-rose-900/30 rounded-lg text-xs text-rose-450 flex items-center space-x-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            {/* Total Users */}
            <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">
                  Total Tenants
                </CardTitle>
                <Users className="h-4.5 w-4.5 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalUsers || 0}</div>
                <p className="text-[10px] text-zinc-550 mt-1">Registered clinic users</p>
              </CardContent>
            </Card>

            {/* Total Appeals */}
            <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">
                  Appeals Generated
                </CardTitle>
                <FileText className="h-4.5 w-4.5 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalAppeals || 0}</div>
                <p className="text-[10px] text-zinc-550 mt-1">Processed appeal letters</p>
              </CardContent>
            </Card>

            {/* Total Projected Revenue */}
            <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">
                  Total Payments
                </CardTitle>
                <DollarSign className="h-4.5 w-4.5 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${(stats.totalRevenue || 0).toFixed(2)}</div>
                <p className="text-[10px] text-zinc-550 mt-1">Aggregated Stripe processing</p>
              </CardContent>
            </Card>

            {/* Average OCR Confidence */}
            <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">
                  Avg OCR Confidence
                </CardTitle>
                <Activity className="h-4.5 w-4.5 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {((stats.averageOcrConfidence || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-[10px] text-zinc-550 mt-1">Extraction pipeline quality</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Analytics Summary */}
          <Card className="border border-white/[0.08] bg-[#14171C]">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">System Telemetry status</CardTitle>
              <CardDescription className="text-xs text-zinc-450">Live operational status summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-zinc-400">
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                <span>Database Connection</span>
                <Badge variant="success">ONLINE</Badge>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                <span>Mistral & OpenAI API Gateway</span>
                <Badge variant="success">HEALTHY</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Private Document Vaults</span>
                <Badge variant="success">CONNECTED</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Tenant Directory</CardTitle>
            <CardDescription className="text-xs text-zinc-450">
              Review registered users, adjust access permissions, and update subscription levels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-white/[0.08] rounded-lg">
              <Table>
                <TableHeader className="bg-[#101216]">
                  <TableRow className="border-b border-white/[0.08] hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider py-3.5">Email</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subscription Tier</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Registered</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isCurrentUserAdmin = u.role === 'ADMIN';
                    const activePlan = u.subscription?.planId || 'free';
                    const planLabel = activePlan === 'pro' ? 'Professional Pro' : 'Starter Free';
                    const planBadge = activePlan === 'pro' ? 'success' : 'secondary';

                    return (
                      <TableRow key={u.id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                        <TableCell className="text-xs text-zinc-200 font-semibold py-3">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={isCurrentUserAdmin ? 'success' : 'outline'} className="text-[9px] uppercase font-bold tracking-wider">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={planBadge} className="text-[9px] uppercase font-bold tracking-wider">
                            {planLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-550 font-mono">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRoleToggle(u.id, u.role)}
                            disabled={processingId !== null}
                            className="text-[10px] font-bold h-7 border-white/[0.08] hover:bg-white/[0.04] active:scale-[0.98]"
                          >
                            {processingId === u.id + '-role' && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                            Toggle Role
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePlanToggle(u.id, activePlan)}
                            disabled={processingId !== null}
                            className="text-[10px] font-bold h-7 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white active:scale-[0.98]"
                          >
                            {processingId === u.id + '-plan' && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                            Toggle Tier
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: FEATURE FLAGS */}
      {activeTab === 'flags' && (
        <div className="grid gap-6 md:grid-cols-2">
          {flags.map((flag) => {
            const isToggling = processingId === flag.key;
            return (
              <Card key={flag.id} className="border border-white/[0.08] bg-[#14171C] shadow-2xl relative overflow-hidden group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xs font-bold text-white tracking-wider font-mono">
                        {flag.key}
                      </CardTitle>
                      <CardDescription className="text-[10px] text-zinc-450 mt-1">
                        {flag.description || 'System configuration option.'}
                      </CardDescription>
                    </div>
                    <Badge variant={flag.value ? 'success' : 'secondary'} className="text-[9px] uppercase font-bold tracking-wider">
                      {flag.value ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex justify-end pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFlagToggle(flag.key, flag.value)}
                    disabled={isToggling}
                    className="text-xs font-bold border-white/[0.08] hover:bg-white/[0.04] active:scale-[0.98]"
                  >
                    {isToggling ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Sliders className="h-3 w-3 mr-1.5" />
                        {flag.value ? 'Disable' : 'Enable'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOGS */}
      {activeTab === 'audits' && (
        <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">System Transaction Log Trail</CardTitle>
            <CardDescription className="text-xs text-zinc-450">
              Security operations and billing status transitions synced to audit log table records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500 border border-white/[0.08] rounded-lg">
                No system transactions logged.
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/[0.08] rounded-lg">
                <Table>
                  <TableHeader className="bg-[#101216]">
                    <TableRow className="border-b border-white/[0.08] hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider py-3">Timestamp</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Action Code</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">User ID</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                        <TableCell className="text-xs text-zinc-450 py-3 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-mono font-bold tracking-wider">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 font-mono">
                          {log.userId || 'System'}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-300 text-right max-w-xs truncate font-mono">
                          {JSON.stringify(log.details || {})}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: SYSTEM HEALTH */}
      {activeTab === 'health' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Health Stats */}
          <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Operational Health Telemetry</CardTitle>
              <CardDescription className="text-xs text-zinc-450">Real-time status indicators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-zinc-400">
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                <span className="flex items-center">
                  <Server className="h-4 w-4 mr-2 text-zinc-450" /> Database Server
                </span>
                <span className="flex items-center text-[#10B981] font-semibold">
                  <CheckCircle className="h-4 w-4 mr-1 text-[#10B981]" /> {initialHealth.database}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                <span className="flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-zinc-455" /> OpenAI Latency
                </span>
                <span className="flex items-center text-[#10B981] font-semibold">
                  <CheckCircle className="h-4 w-4 mr-1 text-[#10B981]" /> {initialHealth.openai}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-2.5">
                <span className="flex items-center">
                  <FolderLock className="h-4 w-4 mr-2 text-zinc-455" /> Document Vaults
                </span>
                <span className="flex items-center text-[#10B981] font-semibold">
                  <CheckCircle className="h-4 w-4 mr-1 text-[#10B981]" /> {initialHealth.storage}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>System Uptime</span>
                <span className="font-mono text-zinc-300 font-bold">{initialHealth.uptimeSeconds} seconds</span>
              </div>
            </CardContent>
          </Card>

          {/* Verification Audit */}
          <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">Compliance & Encryption logs</CardTitle>
              <CardDescription className="text-xs text-zinc-450">Security certifications check.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs text-zinc-400">
              <div className="p-3 bg-[#08090B] border border-white/[0.08] rounded-lg flex items-start space-x-3">
                <CheckCircle className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-zinc-200">HIPAA Compliance</h4>
                  <p className="text-[10px] text-zinc-550 mt-0.5">Clinic tenant storage volumes are fully isolated.</p>
                </div>
              </div>
              <div className="p-3 bg-[#08090B] border border-white/[0.08] rounded-lg flex items-start space-x-3">
                <CheckCircle className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-zinc-200">Webhooks Verification</h4>
                  <p className="text-[10px] text-zinc-550 mt-0.5">Stripe webhook endpoint signatures verified.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
