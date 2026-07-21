import { AiProvider, AppealResult } from './provider';
import { ApiError } from '@/lib/errors';
import log from '@/lib/logger';

export class NullAiProvider implements AiProvider {
  async generateAppeal(
    _metadata: Record<string, any>,
    _promptVersion: string
  ): Promise<AppealResult> {
    log.warn({}, 'Attempted AI appeal generation without an active AI provider configured.');
    throw new ApiError(
      400,
      'AI_PROVIDER_NOT_CONFIGURED',
      'AI generation is currently disabled because no AI API key (GEMINI_API_KEY or OPENAI_API_KEY) is configured.'
    );
  }
}
