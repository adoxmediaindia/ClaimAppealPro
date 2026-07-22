'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, Bell, User, CreditCard, LogOut, ChevronDown, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { logoutUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { markNotificationsReadAction } from '@/app/actions/notifications';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  userEmail?: string;
  usageCount?: number;
  usageLimit?: number;
  initialNotifications?: any[];
}

export default function Header({
  onOpenMobileSidebar,
  onOpenCommandPalette,
  userEmail = 'user@example.com',
  usageCount = 0,
  usageLimit = 5,
  initialNotifications = [],
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await markNotificationsReadAction();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleLogout = async () => {
    const response = await logoutUser();
    if (response.success) {
      router.push('/login');
    }
  };

  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumb = pathSegments.map((segment) => {
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });

  const usagePercent = Math.min(Math.round((usageCount / usageLimit) * 100), 100);

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#08090B]/60 px-6 backdrop-blur-md sticky top-0 z-30">
      
      {/* Breadcrumbs & Mobile Trigger */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded p-1.5 text-zinc-450 hover:bg-white/[0.04] hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <div className="hidden sm:flex items-center space-x-2 text-xs">
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            App
          </Link>
          {breadcrumb.map((name, i) => (
            <React.Fragment key={name}>
              <span className="text-zinc-700">/</span>
              <span className={i === breadcrumb.length - 1 ? 'text-white font-semibold' : 'text-zinc-450'}>
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
          className="hidden md:flex items-center space-x-2 rounded-md border border-white/[0.08] bg-[#101216] px-3 py-1.5 text-xs text-zinc-500 hover:border-white/[0.15] hover:text-zinc-400 transition-all w-44 justify-between"
        >
          <span className="flex items-center space-x-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
          </span>
          <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded bg-[#08090B] px-1.5 font-mono text-[9px] font-medium border border-white/[0.08]">
            <span>⌘</span>K
          </kbd>
        </button>

        {/* Usage Quota Card */}
        <div className="hidden lg:flex flex-col space-y-1 text-[10px] border-r border-white/[0.08] pr-4 mr-2">
          <div className="flex justify-between text-zinc-450">
            <span>Appeals API Quota</span>
            <span className="font-semibold text-zinc-300 ml-3">{usageCount} / {usageLimit}</span>
          </div>
          <div className="h-1 w-32 rounded-full bg-[#101216] overflow-hidden">
            <div
              style={{ width: `${usagePercent}%` }}
              className="h-full bg-[#4F8CFF] rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative rounded-md p-1.5 text-zinc-450 hover:bg-white/[0.04] hover:text-white transition-colors"
          >
            <Bell className="h-4.5 w-4.5" />
            {notifications.some((n) => !n.read) && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#4F8CFF] animate-ping" />
            )}
          </button>

          {notificationsOpen && (
            <>
              <div onClick={() => setNotificationsOpen(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-0 mt-2 w-80 rounded-md border border-white/[0.08] bg-[#14171C] p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-2 mb-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    Notifications
                  </span>
                  {notifications.some((n) => !n.read) && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[9px] font-bold text-[#4F8CFF] hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-zinc-550 text-[10px]">
                      No active notifications.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = n.type === 'SUCCESS' ? CheckCircle : n.type === 'WARNING' ? AlertTriangle : n.type === 'ERROR' ? XCircle : Info;
                      const iconColor = n.type === 'SUCCESS' ? 'text-emerald-450' : n.type === 'WARNING' ? 'text-amber-450' : n.type === 'ERROR' ? 'text-rose-450' : 'text-sky-450';
                      return (
                        <div
                          key={n.id}
                          className={`flex items-start space-x-2.5 p-2 rounded transition-colors ${
                            n.read ? 'opacity-60 bg-transparent' : 'bg-white/[0.02]'
                          }`}
                        >
                          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor}`} />
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-[11px] font-bold text-zinc-200 truncate ${!n.read && 'font-extrabold text-white'}`}>
                              {n.title}
                            </h4>
                            <p className="text-[10px] text-zinc-450 leading-normal mt-0.5 whitespace-pre-wrap select-text">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-zinc-600 block mt-1 font-mono">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4F8CFF] shrink-0 mt-2" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 rounded-full border border-white/[0.08] bg-[#101216] p-1 pl-2 text-left hover:border-white/[0.15] transition-all"
          >
            <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-200">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-[10px] font-semibold text-zinc-300 pr-1">{userEmail}</span>
            <ChevronDown className="h-3 w-3 text-zinc-550" />
          </button>

          {/* Profile Dropdown Overlay Cards */}
          {dropdownOpen && (
            <>
              <div onClick={() => setDropdownOpen(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-white/[0.08] bg-[#14171C] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2 py-1.5 text-[10px] text-zinc-500 border-b border-white/[0.05] mb-1 font-bold uppercase tracking-wider">
                  Manage Account
                </div>
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-2 rounded px-2 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-white/[0.04] hover:text-white transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-zinc-450" />
                  <span>Profile Overview</span>
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-2 rounded px-2 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-white/[0.04] hover:text-white transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5 text-zinc-450" />
                  <span>Billing & Subscription</span>
                </Link>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center space-x-2 rounded px-2 py-1.5 text-xs font-bold text-rose-450 hover:bg-rose-955/10 hover:text-rose-450 transition-colors mt-1 pt-1.5 border-t border-white/[0.05]"
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
