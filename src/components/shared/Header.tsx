'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, Bell, User, CreditCard, LogOut, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { logoutUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  userEmail?: string;
  usageCount?: number;
  usageLimit?: number;
}

export default function Header({
  onOpenMobileSidebar,
  onOpenCommandPalette,
  userEmail = 'user@example.com',
  usageCount = 0,
  usageLimit = 5,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    const response = await logoutUser();
    if (response.success) {
      router.push('/login');
    }
  };

  // Convert pathname to readable breadcrumbs
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumb = pathSegments.map((segment) => {
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });

  const usagePercent = Math.min(Math.round((usageCount / usageLimit) * 100), 100);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800/90 bg-zinc-900/40 px-6 backdrop-blur-md sticky top-0 z-30">
      
      {/* Breadcrumbs & Mobile Trigger */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <div className="hidden sm:flex items-center space-x-2 text-sm">
          <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition-colors">
            App
          </Link>
          {breadcrumb.map((name, i) => (
            <React.Fragment key={name}>
              <span className="text-zinc-600">/</span>
              <span className={i === breadcrumb.length - 1 ? 'text-zinc-100 font-medium' : 'text-zinc-450'}>
                {name}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Global Actions Block */}
      <div className="flex items-center space-x-4">
        
        {/* Command Palette Trigger Box */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center space-x-2 rounded-md border border-zinc-800/90 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-all w-48 justify-between"
        >
          <span className="flex items-center space-x-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
          </span>
          <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded bg-zinc-900 px-1.5 font-mono text-[10px] font-medium border border-zinc-800/90">
            <span>⌘</span>K
          </kbd>
        </button>

        {/* Usage Quota Card */}
        <div className="hidden lg:flex flex-col space-y-1.5 text-[11px] border-r border-zinc-800/90 pr-4 mr-2">
          <div className="flex justify-between text-zinc-400">
            <span>Monthly Appeals API Quota</span>
            <span className="font-semibold text-zinc-300 ml-3">{usageCount} / {usageLimit}</span>
          </div>
          <div className="h-1.5 w-44 rounded-full bg-zinc-800 overflow-hidden">
            <div
              style={{ width: `${usagePercent}%` }}
              className="h-full bg-zinc-300 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Notifications Icon (placeholder architecture) */}
        <button className="relative rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-zinc-100" />
        </button>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 rounded-full border border-zinc-800/90 bg-zinc-950 p-1 pl-2 text-left hover:border-zinc-700 transition-all"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-zinc-300 pr-1">{userEmail}</span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </button>

          {/* Profile Dropdown Overlay Cards */}
          {dropdownOpen && (
            <>
              <div onClick={() => setDropdownOpen(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-zinc-800/90 bg-zinc-900 p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2 py-1.5 text-xs text-zinc-500 border-b border-zinc-800/60 mb-1">
                  Manage Account
                </div>
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-2 rounded px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Profile Overview</span>
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-2 rounded px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Billing & Subscription</span>
                </Link>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center space-x-2 rounded px-2 py-1.5 text-xs font-medium text-rose-450 hover:bg-zinc-850 hover:text-rose-400 transition-colors mt-1 pt-1.5 border-t border-zinc-800/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
