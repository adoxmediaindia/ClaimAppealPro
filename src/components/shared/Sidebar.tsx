'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, CreditCard, Settings, LogOut, X, ShieldAlert } from 'lucide-react';
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
  ];

  // If user is admin, provide access link to administration panel
  if (userRole === 'ADMIN') {
    navItems.push({ name: 'Admin panel', href: '/admin', icon: ShieldAlert });
  }

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800/90 bg-zinc-900 transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:static lg:translate-x-0'
        )}
      >

        {/* Header Branding */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-800/60">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-zinc-100 bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              ClaimAppealPro
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-100')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout Action */}
        <div className="border-t border-zinc-800/60 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-850 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
