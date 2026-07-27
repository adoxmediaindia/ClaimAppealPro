'use server';

import { createServerSideClient } from '@/lib/supabase';
import { SupabaseStorageProvider } from '@/lib/storage';
import { MistralOcrProvider, TesseractOcrProvider, type OcrResult } from '@/lib/ocr/provider';
import { OcrNormalizer, type OcrStructuredData } from '@/lib/ocr/normalizer';
import { OcrValidator, type OcrWarning } from '@/lib/ocr/validator';
import { ApiError, UnauthorizedError } from '@/lib/errors';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import { type ActionResponse } from './auth';
import { parsePdf } from '@/lib/ocr/pdf-parser';
export interface OcrProcessingResponse {
  appealId: string;
  fileId: string;
  structuredData: OcrStructuredData;
  warnings: OcrWarning[];
  providerUsed: string;
}

import { getPlanById } from '@/lib/billing/plans';

/**
 * Downloads a file, executes OCR (primary: Mistral, fallback: Tesseract), normalizes text, 
 * validates the fields, and stores the structured JSON in database.
 * Enforces strict user ownership blocks (BOLA).
 */
export async function processOcrForFile(fileId: string): Promise<ActionResponse<OcrProcessingResponse>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, fileId }, 'File OCR intelligence processing initiated');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('User session is invalid or expired.');
    }

    // 1. Log OCR start audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'OCR_STARTED',
        details: { fileId },
      },
    });

    // Check billing quota limits
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscription: true,
        _count: {
          select: {
            appeals: {
              where: {
                createdAt: { gte: startOfMonth },
              },
            },
          },
        },
      },
    });

    const activePlanId = dbUser?.subscription?.status === 'active' ? dbUser.subscription.planId : 'free';
    const planConfig = getPlanById(activePlanId);
    const activeUsageCount = dbUser?._count?.appeals || 0;

    if (activeUsageCount >= planConfig.limit) {
      throw new ApiError(402, 'QUOTA_EXCEEDED', `Billing quota exceeded: your plan limit is ${planConfig.limit} appeal letters.`);
    }

    // 2. Fetch file record and verify ownership
    const fileRecord = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        appeal: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!fileRecord || fileRecord.appeal.userId !== user.id) {
      log.warn({ correlationId, fileId, userId: user.id }, 'BOLA violation blocked in OCR trigger');
      throw new UnauthorizedError('Access denied for this file resource.');
    }

    // Update appeal status to ANALYZING in database
    await prisma.appeal.update({
      where: { id: fileRecord.appealId },
      data: { status: 'ANALYZING' },
    });

    // 3. Fetch binary buffer from Storage bucket
    const storage = new SupabaseStorageProvider();
    const fileBuffer = await storage.downloadFile(fileRecord.storagePath);

    // 4. Initiate OCR processing pipeline (Native PDF parse -> Mistral primary -> Tesseract fallback)
    let ocrResult: OcrResult | null = null;
    const startTime = Date.now();

    if (fileRecord.mimeType === 'application/pdf') {
      try {
        log.info({ correlationId }, 'Attempting native PDF text extraction first');
        const pdfData = await parsePdf(fileBuffer);
        const extractedText = (pdfData.text || '').trim();
        
        // If native extraction finds sufficient text content, use it directly (faster and highly accurate)
        if (extractedText.length > 150) {
          log.info({ correlationId, textLength: extractedText.length }, 'Native PDF text extraction succeeded');
          ocrResult = {
            rawOcrText: extractedText,
            confidenceScore: 1.0,
            provider: 'native',
            processingTimeMs: Date.now() - startTime,
          };
        } else {
          log.info({ correlationId }, 'Native PDF extracted text too short. Falling back to OCR.');
        }
      } catch (pdfErr: any) {
        log.warn({ correlationId, errorMsg: pdfErr.message }, 'Native PDF parser failed. Falling back to OCR provider.');
      }
    }

    if (!ocrResult) {
      const mistral = new MistralOcrProvider();
      try {
        ocrResult = await mistral.extract(fileBuffer, fileRecord.mimeType);
      } catch (err: any) {
        log.warn(
          { correlationId, errorMsg: err.message },
          'Primary Mistral OCR failed. Activating local Tesseract fallback engine'
        );
        
        const tesseract = new TesseractOcrProvider();
        ocrResult = await tesseract.extract(fileBuffer, fileRecord.mimeType);
      }
    }

    // 5. Run normalizer parsing
    const normalizer = new OcrNormalizer();
    const structuredData = normalizer.normalize(ocrResult);

    // 6. Run validation alerts engine
    const validator = new OcrValidator();
    const validationReport = validator.validate(structuredData);

    // 7. Update database record with metadata JSON outputs
    await prisma.appeal.update({
      where: { id: fileRecord.appealId },
      data: {
        status: 'READY', // Ready for user manual review
        rawOcrText: structuredData.rawOcrText,
        extractedMetadata: structuredData as any,
        structuredInput: structuredData as any, // Initialize user edits column with default extraction
      },
    });

    // 8. Log audit events
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FILE_OCR_PROCESS_COMPLETE',
        details: {
          fileId,
          appealId: fileRecord.appealId,
          provider: ocrResult.provider,
          processingTimeMs: ocrResult.processingTimeMs,
          confidence: ocrResult.confidenceScore,
          warningsCount: validationReport.warnings.length,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'OCR_COMPLETED',
        details: {
          fileId,
          appealId: fileRecord.appealId,
          provider: ocrResult.provider,
        },
      },
    });

    log.info({ correlationId, appealId: fileRecord.appealId }, 'OCR extraction pipeline completed successfully');

    return {
      success: true,
      data: {
        appealId: fileRecord.appealId,
        fileId,
        structuredData,
        warnings: validationReport.warnings,
        providerUsed: ocrResult.provider,
      },
    };
  } catch (error: any) {
    // Attempt to rollback status to DRAFT so user can retry uploading / extraction
    try {
      const supabase = await createServerSideClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const fileRecord = await prisma.file.findUnique({
        where: { id: fileId },
        select: { appealId: true },
      });

      if (fileRecord) {
        await prisma.appeal.update({
          where: { id: fileRecord.appealId },
          data: { status: 'DRAFT' },
        });
      }

      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'OCR_FAILED',
            details: {
              fileId,
              error: error instanceof Error ? error.message : String(error),
            },
          },
        });
      }
    } catch (dbErr) {
      log.error({ correlationId }, 'Failed to execute OCR failure database rollback/logging', dbErr);
    }

    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      };
    }

    log.error({ correlationId }, 'Unexpected exception during OCR extraction pipeline', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred during text extraction.',
      },
    };
  }
}

/**
 * Updates the manually reviewed and edited structured input fields for an appeal.
 * Enforces ownership validations to prevent BOLA attacks.
 */
export async function updateAppealStructuredData(
  appealId: string,
  updatedData: any
): Promise<ActionResponse<void>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, appealId }, 'Updating appeal structured data inputs');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('User session is invalid or expired.');
    }

    // Validate ownership
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      select: { userId: true },
    });

    if (!appeal || appeal.userId !== user.id) {
      log.warn({ correlationId, appealId, userId: user.id }, 'BOLA violation blocked in updateAppealStructuredData');
      throw new UnauthorizedError('Access denied for this appeal resource.');
    }

    // Save user edited values in database
    await prisma.appeal.update({
      where: { id: appealId },
      data: {
        structuredInput: updatedData,
        status: 'READY',
      },
    });

    // Log update audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'APPEAL_METADATA_UPDATED',
        details: { appealId },
      },
    });

    log.info({ correlationId, appealId }, 'Appeal structured input updated successfully');

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      };
    }

    log.error({ correlationId }, 'Unexpected error updating appeal structured data', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    };
  }
}
