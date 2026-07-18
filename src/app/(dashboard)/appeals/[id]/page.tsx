import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { SupabaseStorageProvider } from '@/lib/storage';
import OcrReviewForm from '@/components/shared/OcrReviewForm';
import OcrProcessingView from '@/components/shared/OcrProcessingView';
import AiAppealView from '@/components/shared/AiAppealView';
import { OcrValidator } from '@/lib/ocr/validator';

interface AppealReviewPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    edit?: string;
  }>;
}

export default async function AppealReviewPage({ params, searchParams }: AppealReviewPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const appealId = resolvedParams.id;
  const forceEdit = resolvedSearchParams.edit === 'true';

  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 1. Fetch Appeal and its associated uploads, versions, and metrics logs
  const appeal = await prisma.appeal.findUnique({
    where: { id: appealId },
    include: {
      files: {
        take: 1, // Focus on the primary uploaded claim document
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
      aiGenerations: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // 2. Validate ownership (BOLA prevention)
  if (!appeal || appeal.deletedAt || appeal.userId !== user.id) {
    redirect('/dashboard');
  }

  const file = appeal.files[0];
  if (!file) {
    // If no uploaded file is found, redirect to upload dropzone
    redirect('/appeals/new');
  }

  // 3. Generate secure signed URL for the original file preview
  const storage = new SupabaseStorageProvider();
  const fileDownloadUrl = await storage.generateDownloadUrl(file.storagePath);

  // 4. Status Routing
  if (appeal.status === 'DRAFT' || appeal.status === 'ANALYZING') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Analyzing Document</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Parsing claim identifiers. This will take a moment.
          </p>
        </div>
        <OcrProcessingView
          fileId={file.id}
          fileName={file.fileName}
        />
      </div>
    );
  }

  // If status is GENERATED or EXPORTED and user did not override with force-edit, render document viewer
  if ((appeal.status === 'GENERATED' || appeal.status === 'EXPORTED') && appeal.versions.length > 0 && !forceEdit) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Draft Completed</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Your automated insurance denial appeal letter draft has been generated.
            </p>
          </div>
          
          <a
            href={`/appeals/${appeal.id}?edit=true`}
            className="inline-flex items-center justify-center rounded-md border border-zinc-800 bg-transparent text-xs font-semibold px-4 py-2 text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            Edit Source Fields
          </a>
        </div>

        <AiAppealView
          appealId={appeal.id}
          versions={appeal.versions}
          aiGenerations={appeal.aiGenerations}
        />
      </div>
    );
  }

  // Otherwise, status is READY or edit parameter was set: perform local validation alerts compilation
  const inputMetadata = (appeal.structuredInput as any) || {};
  const validator = new OcrValidator();
  const validationReport = validator.validate(inputMetadata);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Review Extracted Data</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Review and verify dates, provider codes, and denial reasons parsed by the intelligence engine.
        </p>
      </div>

      <OcrReviewForm
        appealId={appeal.id}
        initialData={inputMetadata}
        warnings={validationReport.warnings}
        fileDownloadUrl={fileDownloadUrl}
        fileName={file.fileName}
      />
    </div>
  );
}
