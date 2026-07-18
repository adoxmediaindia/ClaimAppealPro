'use client';

import React, { useEffect, useState, useTransition, useCallback } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { processOcrForFile } from '@/app/actions/ocr';
import { useRouter } from 'next/navigation';

interface OcrProcessingViewProps {
  fileId: string;
  fileName: string;
}

export default function OcrProcessingView({ fileId, fileName }: OcrProcessingViewProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'IDLE' | 'ANALYZING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const runOcrPipeline = useCallback(() => {
    setStatus('ANALYZING');
    setErrorMessage(null);

    startTransition(async () => {
      const response = await processOcrForFile(fileId);
      if (response.success) {
        setStatus('SUCCESS');
        router.refresh();
      } else {
        setStatus('ERROR');
        setErrorMessage(response.error?.message || 'Failed to extract claim text.');
      }
    });
  }, [fileId, router]);

  useEffect(() => {
    runOcrPipeline();
  }, [fileId, runOcrPipeline]);


  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="border border-zinc-800 shadow-2xl">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-6">
          
          {status === 'ANALYZING' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-zinc-700/20 blur-xl animate-pulse" />
                <Loader2 className="h-12 w-12 animate-spin text-zinc-300 relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-zinc-100 flex items-center justify-center space-x-2">
                  <Sparkles className="h-4.5 w-4.5 text-zinc-400" />
                  <span>Document Intelligence Analysis</span>
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Extracting claim details and billing identifiers from <span className="font-semibold text-zinc-200">{fileName}</span>...
                </p>
              </div>
              <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                <div className="h-full bg-zinc-300 rounded-full animate-progress" />
              </div>
            </>
          )}

          {status === 'SUCCESS' && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/40 text-emerald-450 border border-emerald-800">
                <CheckCircleIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-zinc-200">Extraction Complete</h3>
                <p className="text-xs text-zinc-500">
                  Ready. Loading editing form viewport...
                </p>
              </div>
            </>
          )}

          {status === 'ERROR' && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-950/40 text-rose-455 border border-rose-900">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-zinc-200">Extraction Failed</h3>
                <p className="text-xs text-rose-455 max-w-xs mx-auto">
                  {errorMessage || 'Failed to complete OCR intelligence.'}
                </p>
              </div>
              <Button onClick={runOcrPipeline} size="sm" className="flex items-center space-x-1 mt-2">
                <RefreshCw className="h-4 w-4 text-zinc-955" />
                <span className="font-semibold text-zinc-955">Retry Extraction</span>
              </Button>
            </>
          )}

        </CardContent>
        <CardFooter className="flex items-center justify-center border-t border-zinc-850/60 p-4 text-[10px] text-zinc-500">
          Powered by Mistral Document Intelligent API / Tesseract local fallbacks.
        </CardFooter>
      </Card>
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
