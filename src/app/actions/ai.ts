'use server';

import { createServerSideClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { OpenAiProvider } from '@/lib/ai/openai';
import { ResponseValidator } from '@/lib/ai/validator';
import { ValidationError, UnauthorizedError, ApiError } from '@/lib/errors';
import { getPlanById } from '@/lib/billing/plans';

import log from '@/lib/logger';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Orchestrates the AI appeal letter generation pipeline.
 */
export async function generateAppealAction(appealId: string): Promise<ActionResponse<{ versionNumber: number; letterContent: string }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, appealId }, 'AI appeal generation action started');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new UnauthorizedError('Unauthorized: Authentication required.');
    }

    // Check billing quota limits
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscription: true,
        _count: {
          select: {
            appeals: true,
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

    // 1. Retrieve Appeal and verify ownership (BOLA prevention)
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!appeal || appeal.deletedAt) {
      throw new ValidationError('Appeal draft not found.');
    }
    if (appeal.userId !== user.id) {
      throw new UnauthorizedError('BOLA protection: Unauthorized access to document appeal data.');
    }

    // Only allow generation if status is READY or GENERATED (allowing regeneration)
    if (appeal.status !== 'READY' && appeal.status !== 'GENERATED') {
      throw new ValidationError('Appeal is not ready for generation. Complete OCR processing first.');
    }

    const structuredInput = (appeal.structuredInput as Record<string, any>) || {};

    // 2. Call OpenAI Provider with retry wrapper
    const provider = new OpenAiProvider();
    const validator = new ResponseValidator();
    
    let result: any = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        result = await provider.generateAppeal(structuredInput, 'v1.0');
        
        // 3. Validate AI Response
        const validationReport = validator.validate(result, structuredInput);
        if (validationReport.isValid) {
          break; // Validation passed!
        }
        
        log.warn(
          { correlationId, attempt: attempts, errors: validationReport.errors },
          'AI generation validation failed. Retrying completion...'
        );
        if (attempts >= maxAttempts) {
          throw new ValidationError('AI response validation failed. Missing required clinical segments.', {
            errors: validationReport.errors,
          });
        }
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          throw err;
        }
      }
    }

    // 4. Determine next version number
    const currentMaxVersion = appeal.versions[0]?.versionNumber || 0;
    const nextVersion = currentMaxVersion + 1;

    // 5. Database transaction updates
    await prisma.$transaction(async (tx) => {
      // Create new AppealVersion
      await tx.appealVersion.create({
        data: {
          appealId: appeal.id,
          versionNumber: nextVersion,
          letterContent: result.formattedLetter,
          editorState: {
            title: result.title,
            executiveSummary: result.executiveSummary,
            medicalNecessity: result.medicalNecessity,
            policyArgument: result.policyArgument,
            supportingEvidence: result.supportingEvidence,
            closingRequest: result.closingRequest,
          },
        },
      });

      // Log token usage details
      await tx.aiGeneration.create({
        data: {
          appealId: appeal.id,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          cost: result.usage.cost,
          promptTemplateUsed: 'v1.0',
          rawResponse: JSON.stringify(result),
        },
      });

      // Update quota limits usage log
      await tx.usageLog.create({
        data: {
          userId: user.id,
          action: 'GENERATE_AI_APPEAL',
          tokenCount: result.usage.totalTokens,
          costEstimate: result.usage.cost,
        },
      });

      // Update Parent Appeal Status
      await tx.appeal.update({
        where: { id: appeal.id },
        data: {
          status: 'GENERATED',
        },
      });

      // Write System audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'GENERATE_AI_APPEAL',
          details: {
            appealId: appeal.id,
            versionNumber: nextVersion,
            tokens: result.usage.totalTokens,
            cost: result.usage.cost,
          },
        },
      });
    });

    log.info(
      { correlationId, appealId, version: nextVersion },
      'AI appeal letter generated and logged successfully'
    );
    return {
      success: true,
      data: {
        versionNumber: nextVersion,
        letterContent: result.formattedLetter,
      },
    };
  } catch (error: any) {
    log.error({ correlationId, error: error.message }, 'Failed to execute AI generation action');
    return {
      success: false,
      error: {
        code: error.errorCode || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred during appeal letter generation.',
        details: error.details,
      },
    };
  }
}

/**
 * Rolls back an appeal letter draft to an older version (roll-forward pattern).
 */
export async function rollbackAppealVersionAction(
  appealId: string,
  targetVersionNumber: number
): Promise<ActionResponse<{ versionNumber: number; letterContent: string }>> {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId, appealId, targetVersionNumber }, 'Rollback appeal version action started');

  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new UnauthorizedError('Unauthorized: Authentication required.');
    }

    // 1. Fetch parent appeal and target version (checking ownership)
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!appeal || appeal.deletedAt) {
      throw new ValidationError('Appeal draft not found.');
    }
    if (appeal.userId !== user.id) {
      throw new UnauthorizedError('BOLA protection: Unauthorized access to document appeal data.');
    }

    const targetVersion = appeal.versions.find((v) => v.versionNumber === targetVersionNumber);
    if (!targetVersion || targetVersion.deletedAt) {
      throw new ValidationError(`Version #${targetVersionNumber} not found.`);
    }

    // 2. Increment latest version number and copy contents (roll-forward)
    const currentMaxVersion = appeal.versions[0]?.versionNumber || 0;
    const nextVersion = currentMaxVersion + 1;

    await prisma.$transaction(async (tx) => {
      await tx.appealVersion.create({
        data: {
          appealId: appeal.id,
          versionNumber: nextVersion,
          letterContent: targetVersion.letterContent,
          editorState: targetVersion.editorState || undefined,
        },
      });

      // Write System audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ROLLBACK_AI_APPEAL',
          details: {
            appealId: appeal.id,
            restoredVersion: targetVersionNumber,
            newVersion: nextVersion,
          },
        },
      });
    });

    log.info(
      { correlationId, appealId, version: nextVersion },
      'Appeal version rolled back successfully via roll-forward create'
    );
    return {
      success: true,
      data: {
        versionNumber: nextVersion,
        letterContent: targetVersion.letterContent,
      },
    };
  } catch (error: any) {
    log.error({ correlationId, error: error.message }, 'Failed to execute rollback action');
    return {
      success: false,
      error: {
        code: error.errorCode || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred during draft rollback.',
      },
    };
  }
}
