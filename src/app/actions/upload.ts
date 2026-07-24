'use server';

import { createServerSideClient } from '@/lib/supabase';
import { SupabaseStorageProvider } from '@/lib/storage';
import { ApiError, UnauthorizedError } from '@/lib/errors';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import { type ActionResponse } from './auth';

/**
 * Requests a secure presigned upload URL.
 */
export async function getPresignedUploadUrl(
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<ActionResponse<{ uploadUrl: string; storagePath: string }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, fileName, mimeType, fileSize }, 'Presigned upload URL request initiated');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('User session is invalid or expired.');
    }

    const storage = new SupabaseStorageProvider();
    const { uploadUrl, storagePath } = await storage.generateUploadUrl(user.id, fileName, mimeType, fileSize);

    // Save upload audit trail
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FILE_UPLOAD_INITIATED',
        details: { fileName, mimeType, fileSize, storagePath },
      },
    });

    return {
      success: true,
      data: {
        uploadUrl,
        storagePath,
      },
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      };
    }

    const errorDetails = {
      message: error?.message || 'No error message',
      name: error?.name || 'Error',
      stack: error?.stack || 'No stack trace available',
      code: error?.code,
      details: error?.details || null,
      status: error?.status || null,
    };

    log.error(
      { correlationId, ...errorDetails },
      'Unexpected error generating presigned upload URL detailed debug dump'
    );

    return {
      success: false,
      error: {
        code: 'DEBUG_INTERNAL_ERROR',
        message: `Debug dump: [${errorDetails.name}] ${errorDetails.message}. Stack: ${errorDetails.stack.split('\n').slice(0, 3).join(' | ')}`,
      },
    };
  }
}

/**
 * Registers an uploaded file in the database under a new or existing Appeal record.
 */
export async function registerUploadedFile(
  appealId: string | null,
  fileName: string,
  fileSize: number,
  mimeType: string,
  storagePath: string
): Promise<ActionResponse<{ fileId: string; appealId: string }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, appealId, fileName, storagePath }, 'Registering uploaded file metadata in database');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('User session is invalid or expired.');
    }

    const result = await prisma.$transaction(async (tx) => {
      let activeAppealId = appealId;

      // 1. Create a new Appeal draft if appealId is not supplied
      if (!activeAppealId) {
        const appeal = await tx.appeal.create({
          data: {
            userId: user.id,
            status: 'DRAFT',
            extractedMetadata: {
              fileName,
            },
          },
        });
        activeAppealId = appeal.id;
      } else {
        // Validate ownership to defend against BOLA (Broken Object Level Authorization)
        const existing = await tx.appeal.findUnique({
          where: { id: activeAppealId },
          select: { userId: true },
        });

        if (!existing || existing.userId !== user.id) {
          throw new UnauthorizedError('Access denied for this appeal document.');
        }
      }

      // 2. Insert File record associated to Appeal
      const file = await tx.file.create({
        data: {
          appealId: activeAppealId,
          fileName,
          fileSize,
          mimeType,
          storagePath,
        },
      });

      // 3. Log virus scan hook execution placeholder trigger
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'FILE_UPLOAD_COMPLETE',
          details: { fileId: file.id, appealId: activeAppealId, storagePath },
        },
      });

      return {
        fileId: file.id,
        appealId: activeAppealId,
      };
    });

    log.info({ correlationId, fileId: result.fileId, appealId: result.appealId }, 'File registered successfully');

    return {
      success: true,
      data: result,
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

    log.error({ correlationId }, 'Unexpected error registering uploaded file metadata', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    };
  }
}

/**
 * Deletes an uploaded file from database and Supabase storage.
 * Enforces ownership validations to prevent BOLA attacks.
 */
export async function deleteUploadedFile(fileId: string): Promise<ActionResponse<void>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, fileId }, 'File deletion initiated');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError('User session is invalid or expired.');
    }

    // 1. Fetch file record and verify parent Appeal ownership
    const fileRecord = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        appeal: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!fileRecord || fileRecord.appeal.userId !== user.id) {
      log.warn({ correlationId, userId: user?.id, fileId }, 'BOLA violation blocked: user attempting unauthorized file deletion');
      throw new UnauthorizedError('Access denied for this file resource.');
    }

    // 2. Purge file from storage bucket
    const storage = new SupabaseStorageProvider();
    await storage.deleteFile(fileRecord.storagePath);

    // 3. Purge record from database
    await prisma.file.delete({
      where: { id: fileId },
    });

    // 4. Log audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FILE_DELETED',
        details: { fileId, storagePath: fileRecord.storagePath },
      },
    });

    log.info({ correlationId, fileId }, 'File deleted successfully from storage and DB');

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

    log.error({ correlationId }, 'Unexpected error deleting file', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    };
  }
}
