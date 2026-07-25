'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function RootErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root runtime exception caught by error boundary:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0C0E12] text-zinc-100 py-12 px-6 text-center space-y-4">
      <div className="bg-rose-950/20 border border-rose-900/50 text-rose-400 p-6 rounded-lg max-w-md shadow-2xl">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-2">Application Error</h2>
        <p className="text-xs text-zinc-300 leading-relaxed font-semibold">
          An unexpected server-side exception or database connection failure occurred.
        </p>
        {error.digest && (
          <p className="text-[10px] text-zinc-500 font-mono mt-3">
            Error Digest: {error.digest}
          </p>
        )}
      </div>
      <Button
        onClick={() => reset()}
        className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9 px-6 rounded text-xs"
      >
        Retry Operation
      </Button>
    </div>
  );
}
