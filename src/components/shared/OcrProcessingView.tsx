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
      <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-6">
          
          {status === 'ANALYZING' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#4F8CFF]/5 blur-xl animate-pulse" />
                <Loader2 className="h-12 w-12 animate-spin text-[#4F8CFF] relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white flex items-center justify-center space-x-2">
                  <Sparkles className="h-4.5 w-4.5 text-[#6EE7F9]" />
                  <span>Document Intelligence Analysis</span>
                </h3>
                <p className="text-xs text-zinc-450 max-w-xs mx-auto">
                  Extracting claim details and billing identifiers from <span className="font-semibold text-zinc-200">{fileName}</span>...
                </p>
              </div>
              <div className="h-1 w-full bg-[#08090B] rounded-full overflow-hidden border border-white/[0.08]">
                <div className="h-full bg-gradient-to-r from-[#4F8CFF] to-[#6EE7F9] rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </>
          )}

          {status === 'SUCCESS' && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#064E3B]/20 text-[#10B981] border border-[#064E3B]/30 animate-bounce">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-955/20 text-rose-450 border border-rose-900/30">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-zinc-200">Extraction Failed</h3>
                <p className="text-xs text-rose-450 max-w-xs mx-auto">
                  {errorMessage || 'Failed to complete OCR intelligence.'}
                </p>
              </div>
              <Button onClick={runOcrPipeline} size="sm" className="flex items-center space-x-1.5 mt-2 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9">
                <RefreshCw className="h-4 w-4 text-white" />
                <span>Retry Extraction</span>
              </Button>
            </>
          )}

        </CardContent>
        <CardFooter className="flex items-center justify-center border-t border-white/[0.05] p-4 text-[10px] text-zinc-550">
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
