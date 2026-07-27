import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { getPlanById } from '@/lib/billing/plans';
import AppShellClient from '@/components/shared/AppShellClient';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createServerSideClient();
  
  // 1. Authenticate user context server-side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 2. Query public profile configuration and usage parameters from PostgreSQL database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      subscription: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          appeals: {
            where: {
              createdAt: { gte: startOfMonth },
            },
          },
        },
      },
    },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const userRole = dbUser?.role || 'USER';
  const usageCount = dbUser?._count?.appeals || 0;
  
  const planId = dbUser?.subscription?.status === 'active' ? dbUser.subscription.planId : 'free';
  const plan = getPlanById(planId);
  const usageLimit = plan.limit;

  const profile = dbUser?.profile;
  const userName = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user.email || 'User'
    : user.email || 'User';

  return (
    <AppShellClient
      userEmail={user.email || 'user@example.com'}
      userName={userName}
      userRole={userRole}
      usageCount={usageCount}
      usageLimit={usageLimit}
      initialNotifications={notifications}
    >
      {children}
    </AppShellClient>
  );
}
