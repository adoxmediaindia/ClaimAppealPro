'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Search, FileText, LayoutDashboard, CreditCard, Settings, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commandItems = [
    { name: 'Go to Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { name: 'View Appeals List', href: '/appeals', icon: FileText, category: 'Navigation' },
    { name: 'View Billing & Invoices', href: '/billing', icon: CreditCard, category: 'Navigation' },
    { name: 'Go to System Settings', href: '/settings', icon: Settings, category: 'Navigation' },
    { name: 'Create New Appeal Letter', href: '/appeals/new', icon: Plus, category: 'Actions' },
  ];

  // Filter commands by search term
  const filteredItems = commandItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    // Focus search input when dialog opens
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-zinc-950/70 backdrop-blur-sm transition-opacity duration-300">
      
      {/* Click outside backdrop close overlay */}
      <div onClick={onClose} className="fixed inset-0" />

      {/* Modal Dialog card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Input field header */}
        <div className="flex items-center px-4 border-b border-zinc-800/80">
          <Search className="h-4.5 w-4.5 text-zinc-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command or search query..."
            className="w-full py-4 text-sm bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command list content body */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No command matches found.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="px-4 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Commands & Shortcuts
              </div>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-850 hover:text-zinc-100 transition-colors"
                  >
                    <span className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 text-zinc-400" />
                      <span>{item.name}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5 bg-zinc-950 font-mono">
                      Enter
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer help keys description */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/60 border-t border-zinc-800/40 text-[10px] text-zinc-500">
          <span>Use arrows to navigate list</span>
          <span>Esc to close</span>
        </div>

      </div>
    </div>
  );
}
