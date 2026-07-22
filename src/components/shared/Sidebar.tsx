'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, CreditCard, Settings, LogOut, X, ShieldAlert, Activity, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export default function Sidebar({ isOpen, onClose, userRole = 'USER' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const response = await logoutUser();
    if (response.success) {
      router.push('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Appeals', href: '/appeals', icon: FileText },
    { name: 'Billing', href: '/billing', icon: CreditCard },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Activity Logs', href: '/activity', icon: History },
  ];

  if (userRole === 'ADMIN') {
    navItems.push({ name: 'Admin panel', href: '/admin', icon: ShieldAlert });
  }

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.08] bg-[#101216] transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:static lg:translate-x-0'
        )}
      >

        {/* Header Branding */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/[0.08]">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded bg-gradient-to-tr from-[#4F8CFF] to-[#6EE7F9] p-1.5 flex items-center justify-center shadow-lg shadow-[#4F8CFF]/15">
              <Activity className="h-4.5 w-4.5 text-black" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              ClaimAppeal<span className="text-zinc-550 font-medium">Pro</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-white/[0.04] hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center space-x-3 rounded-md px-3 py-2 text-xs font-semibold tracking-wide transition-all group active:scale-[0.98]',
                  isActive
                    ? 'bg-[#4F8CFF] text-white shadow-lg shadow-[#4F8CFF]/10'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout Action */}
        <div className="border-t border-white/[0.08] p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-xs font-bold text-zinc-450 hover:bg-rose-955/20 hover:text-rose-450 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
