'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';
import CommandPalette from '@/components/shared/CommandPalette';

interface AppShellClientProps {
  children: React.ReactNode;
  userEmail: string;
  userRole: string;
  usageCount: number;
  usageLimit: number;
}

export default function AppShellClient({
  children,
  userEmail,
  userRole,
  usageCount,
  usageLimit,
}: AppShellClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    // Listen for Ctrl+K/Cmd+K shortcuts to toggle the command palette
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
      
      {/* 1. Sidebar Panel */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <Header
          onOpenMobileSidebar={() => setSidebarOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          userEmail={userEmail}
          usageCount={usageCount}
          usageLimit={usageLimit}
        />

        {/* Viewport Dashboard Workspace */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>

      </div>

      {/* 3. Global Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

    </div>
  );
}
