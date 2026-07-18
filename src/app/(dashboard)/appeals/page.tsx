import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileSearch } from 'lucide-react';
import Link from 'next/link';

export default function AppealsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Appeals History</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review and download all generated appeal documents.
          </p>
        </div>
        <Link href="/appeals/new">
          <Button size="sm" className="flex items-center space-x-1">
            <Plus className="h-4 w-4 text-zinc-950" />
            <span className="font-medium text-zinc-950">New Appeal</span>
          </Button>
        </Link>
      </div>

      <Card className="border border-zinc-800">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-850/50 text-zinc-400 border border-zinc-800">
            <FileSearch className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-200">No appeals found</h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Get started by uploading your first insurance claim denial document.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
