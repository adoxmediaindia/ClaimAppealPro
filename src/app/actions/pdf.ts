'use server';

import { prisma } from '@/lib/prisma';
import { SupabaseStorageProvider } from '@/lib/storage';
import { PuppeteerPdfProvider } from '@/lib/pdf/puppeteer';
import { renderHtmlTemplate, RenderParams } from '@/lib/pdf/renderer';
import { ApiError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { createServerSideClient } from '@/lib/supabase';

const storageProvider = new SupabaseStorageProvider();
const pdfProvider = new PuppeteerPdfProvider();

interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

function extractValue(field: any): string {
  if (field && typeof field === 'object' && 'value' in field) {
    return String(field.value);
  }
  return field ? String(field) : '';
}

function extractArrayValue(field: any): string[] {
  if (field && typeof field === 'object' && 'value' in field) {
    return Array.isArray(field.value) ? field.value : [String(field.value)];
  }
  return Array.isArray(field) ? field : field ? [String(field)] : [];
}

/**
 * Verifies that the currently authenticated user owns the specified appeal (BOLA protection).
 */
async function verifyAppealOwnership(appealId: string): Promise<string> {
  const supabase = await createServerSideClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'You must be logged in to access this resource.');
  }

  const userId = authData.user.id;

  const appeal = await prisma.appeal.findUnique({
    where: { id: appealId },
  });

  if (!appeal) {
    throw new ApiError(404, 'NOT_FOUND', 'The requested appeal was not found.');
  }

  if (appeal.userId !== userId) {
    throw new ApiError(403, 'FORBIDDEN', 'Access denied. You do not own this appeal.');
  }

  return userId;
}

/**
 * Server Action to generate a versioned PDF document from a completed appeal version draft.
 */
export async function generatePdfExportAction(
  appealId: string,
  versionNumber: number,
  templateName: string,
  size: 'letter' | 'a4' = 'letter'
): Promise<ActionResponse<any>> {
  const correlationId = crypto.randomUUID ? crypto.randomUUID() : 'pdf-gen-uuid';
  
  log.info(
    { correlationId, appealId, versionNumber, templateName, size },
    'generatePdfExportAction action invoked'
  );

  try {
    // 1. Verify BOLA ownership
    const userId = await verifyAppealOwnership(appealId);

    // 2. Fetch specific appeal version
    const targetVersion = await prisma.appealVersion.findUnique({
      where: {
        appeal_version_unique_idx: {
          appealId,
          versionNumber,
        },
      },
    });

    if (!targetVersion) {
      throw new ApiError(404, 'VERSION_NOT_FOUND', `Appeal version #${versionNumber} was not found.`);
    }

    // 3. Fetch structured metadata
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      throw new ApiError(404, 'NOT_FOUND', 'Appeal details not found.');
    }

    // 4. Construct rendering parameters
    const input = (appeal.structuredInput || {}) as Record<string, any>;
    const renderParams: RenderParams = {
      patientName: extractValue(input.patientName) || 'Patient',
      insuranceCompany: extractValue(input.insuranceCompany) || 'N/A',
      claimNumber: extractValue(input.claimNumber) || 'N/A',
      memberId: extractValue(input.memberId) || 'N/A',
      policyNumber: extractValue(input.policyNumber) || 'N/A',
      dateOfService: extractValue(input.dateOfService) || 'N/A',
      denialDate: extractValue(input.denialDate) || 'recently',
      providerName: extractValue(input.providerName) || 'Physician',
      cptCodes: extractArrayValue(input.cptCodes),
      icdCodes: extractArrayValue(input.icdCodes),
      denialReason: extractValue(input.denialReason) || 'N/A',
      appealDeadline: extractValue(input.appealDeadline) || 'N/A',
      contactInformation: extractValue(input.contactInformation) || 'N/A',
      address: extractValue(input.address) || 'N/A',
      letterContent: targetVersion.letterContent,
    };

    // 5. Compile into HTML content
    const htmlContent = renderHtmlTemplate(renderParams, templateName);

    // 6. Generate PDF Buffer
    const result = await pdfProvider.generate(htmlContent, { size });

    // 7. Save PDF binary to secure storage path
    const uniqueFileId = crypto.randomUUID ? crypto.randomUUID() : 'unique-pdf-uuid';
    const storagePath = `users/${userId}/exports/${uniqueFileId}.pdf`;
    
    await storageProvider.uploadFile(storagePath, result.pdfBuffer, 'application/pdf');

    // 8. Commit to database and update status inside transaction
    let newExportRecord: any = null;
    await prisma.$transaction(async (tx) => {
      newExportRecord = await tx.appealPdfExport.create({
        data: {
          appealId,
          appealVersionNumber: versionNumber,
          templateName,
          pageSize: size,
          storagePath,
          fileSize: result.fileSize,
        },
      });

      await tx.appeal.update({
        where: { id: appealId },
        data: {
          status: 'EXPORTED',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PDF_EXPORT_GENERATED',
          ipAddress: '127.0.0.1',
          userAgent: 'Server-Action-Agent',
          details: {
            appealId,
            versionNumber,
            templateName,
            fileSize: result.fileSize,
            exportId: newExportRecord.id,
          },
        },
      });
    });

    log.info(
      { correlationId, appealId, exportId: newExportRecord?.id },
      'generatePdfExportAction completed successfully'
    );

    return {
      success: true,
      data: newExportRecord,
    };
  } catch (err: any) {
    log.error(
      { correlationId, appealId, error: err.message },
      'Failed to execute generatePdfExportAction'
    );

    return {
      success: false,
      error: {
        code: err.errorCode || 'PDF_GENERATION_FAILED',
        message: err.message || 'Failed to render and export appeal document.',
      },
    };
  }
}

/**
 * Server Action to list all versioned PDF exports generated for a given appeal.
 */
export async function getPdfExportsAction(appealId: string): Promise<ActionResponse<any[]>> {
  const correlationId = crypto.randomUUID ? crypto.randomUUID() : 'pdf-list-uuid';

  try {
    await verifyAppealOwnership(appealId);

    const exports = await prisma.appealPdfExport.findMany({
      where: {
        appealId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: exports,
    };
  } catch (err: any) {
    log.error(
      { correlationId, appealId, error: err.message },
      'Failed to retrieve PDF exports list'
    );

    return {
      success: false,
      error: {
        code: err.errorCode || 'FETCH_EXPORTS_FAILED',
        message: err.message || 'Failed to retrieve exported PDF document history.',
      },
    };
  }
}

/**
 * Server Action to retrieve a temporary secure signed download URL for an exported PDF.
 */
export async function getPdfSignedUrlAction(
  appealId: string,
  exportId: string
): Promise<ActionResponse<string>> {
  const correlationId = crypto.randomUUID ? crypto.randomUUID() : 'pdf-signed-url-uuid';

  try {
    await verifyAppealOwnership(appealId);

    const pdfExport = await prisma.appealPdfExport.findUnique({
      where: { id: exportId },
    });

    if (!pdfExport || pdfExport.appealId !== appealId) {
      throw new ApiError(404, 'EXPORT_NOT_FOUND', 'The requested PDF export record was not found.');
    }

    const signedUrl = await storageProvider.generateDownloadUrl(pdfExport.storagePath);

    return {
      success: true,
      data: signedUrl,
    };
  } catch (err: any) {
    log.error(
      { correlationId, appealId, exportId, error: err.message },
      'Failed to generate signed download URL for PDF export'
    );

    return {
      success: false,
      error: {
        code: err.errorCode || 'SIGNED_URL_FAILED',
        message: err.message || 'Failed to generate signed download URL for exported file.',
      },
    };
  }
}
