'use client';

import React, { useState, useRef, useTransition } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { getPresignedUploadUrl, registerUploadedFile, deleteUploadedFile } from '@/app/actions/upload';
import { useRouter } from 'next/navigation';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
  storagePath?: string;
  fileId?: string;
}

export default function NewAppealPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isRegistering, startTransition] = useTransition();
  const [createdAppealId, setCreatedAppealId] = useState<string | null>(null);
  const appealIdRef = useRef<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!ALLOWED_MIMES.includes(file.type)) {
      return 'Only PDF, JPG, and PNG files are accepted.';
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return 'File size must not exceed 10MB.';
    }

    return null;
  };

  const processFiles = (fileList: FileList) => {
    const newItems: UploadItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validationError = validateFile(file);

      const newItem: UploadItem = {
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: validationError ? 'ERROR' : 'PENDING',
        errorMessage: validationError || undefined,
      };
      newItems.push(newItem);
    }

    setUploads((prev) => [...prev, ...newItems]);

    newItems.forEach((item) => {
      if (item.status === 'PENDING') {
        uploadFileDirectly(item);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const uploadFileDirectly = async (item: UploadItem) => {
    updateItemStatus(item.id, { status: 'UPLOADING', progress: 5 });

    try {
      const presignedRes = await getPresignedUploadUrl(item.file.name, item.file.type, item.file.size);
      
      if (!presignedRes.success || !presignedRes.data) {
        throw new Error(presignedRes.error?.message || 'Failed to acquire secure upload path.');
      }

      const { uploadUrl, storagePath } = presignedRes.data;

      updateItemStatus(item.id, { progress: 30 });
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: item.file,
        headers: {
          'Content-Type': item.file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Storage channel transfer failed.');
      }

      updateItemStatus(item.id, { progress: 70 });

      const currentAppealId = appealIdRef.current;
      const registerRes = await registerUploadedFile(currentAppealId, item.file.name, item.file.size, item.file.type, storagePath);

      if (!registerRes.success || !registerRes.data) {
        throw new Error(registerRes.error?.message || 'Prisma registry registration failed.');
      }

      const { fileId, appealId: returnedAppealId } = registerRes.data;

      if (!appealIdRef.current) {
        appealIdRef.current = returnedAppealId;
        setCreatedAppealId(returnedAppealId);
      }

      updateItemStatus(item.id, {
        status: 'SUCCESS',
        progress: 100,
        storagePath,
        fileId,
      });
    } catch (err: any) {
      updateItemStatus(item.id, {
        status: 'ERROR',
        errorMessage: err.message || 'An unexpected error occurred during upload.',
      });
    }
  };

  const updateItemStatus = (id: string, updates: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDelete = async (id: string, fileId?: string) => {
    if (fileId) {
      await deleteUploadedFile(fileId);
    }
    setUploads((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Upload Denial Document</h1>
        <p className="text-xs text-zinc-450 mt-1">
          Select or drop your health insurance denial letters. Accepts PDF, JPG, and PNG up to 10MB.
        </p>
      </div>

      <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
        <CardContent className="p-6">
          
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-[#4F8CFF] bg-[#101216]/80'
                : 'border-white/[0.08] bg-[#08090B] hover:border-white/[0.15]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#101216] border border-white/[0.08] text-zinc-400 mb-4">
              <Upload className="h-5 w-5 text-[#4F8CFF]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-zinc-200">Drag & drop files here</h3>
              <p className="text-[10px] text-zinc-500">or click to browse your folders</p>
            </div>
          </div>

          {/* Uploading Queue */}
          {uploads.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">
                Upload Queue
              </h4>
              <div className="space-y-2">
                {uploads.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col p-3 rounded-lg border border-white/[0.08] bg-[#08090B] space-y-2 animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <FileText className="h-5 w-5 text-zinc-450 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-200 truncate max-w-[200px] sm:max-w-xs">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {item.status === 'SUCCESS' && (
                          <Badge variant="success" className="flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Done</span>
                          </Badge>
                        )}
                        {item.status === 'ERROR' && (
                          <Badge variant="destructive" className="flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Failed</span>
                          </Badge>
                        )}
                        {item.status === 'UPLOADING' && (
                          <Loader2 className="h-4.5 w-4.5 animate-spin text-zinc-500" />
                        )}

                        {item.status === 'ERROR' && (
                          <button
                            onClick={() => uploadFileDirectly(item)}
                            className="rounded p-1 text-zinc-450 hover:bg-white/[0.04] hover:text-white"
                            title="Retry Upload"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(item.id, item.fileId)}
                          disabled={item.status === 'UPLOADING' || isRegistering}
                          className="rounded p-1 text-zinc-450 hover:bg-white/[0.04] hover:text-rose-450 disabled:opacity-30"
                          title="Remove File"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {item.status === 'UPLOADING' && (
                      <div className="space-y-1">
                        <div className="h-1 w-full bg-[#101216] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${item.progress}%` }}
                            className="h-full bg-[#4F8CFF] rounded-full transition-all duration-300"
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-550">
                          <span>Uploading details...</span>
                          <span>{item.progress}%</span>
                        </div>
                      </div>
                    )}

                    {item.status === 'ERROR' && item.errorMessage && (
                      <p className="text-[10px] text-rose-450">{item.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-white/[0.05] pt-4">
          <span className="text-[10px] text-zinc-550">Supports multi-file queue selections.</span>
          
          <div className="flex items-center space-x-2">
            {isRegistering && (
              <div className="flex items-center space-x-2 text-xs text-zinc-400 mr-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4F8CFF]" />
                <span>Redirecting...</span>
              </div>
            )}
            
            {uploads.length > 0 && uploads.every((item) => item.status === 'SUCCESS' || item.status === 'ERROR') && uploads.some((item) => item.status === 'SUCCESS') && createdAppealId && (
              <Button
                onClick={() => {
                  startTransition(() => {
                    router.push(`/appeals/${createdAppealId}`);
                  });
                }}
                disabled={isRegistering}
                className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9 text-xs flex items-center space-x-1.5 animate-pulse shadow-lg shadow-[#4F8CFF]/15"
              >
                <span>Proceed to Analysis</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
