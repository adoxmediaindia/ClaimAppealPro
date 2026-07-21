import { AiProvider } from './provider';
import { OpenAiProvider } from './openai';
import { GeminiAiProvider } from './gemini';
import { NullAiProvider } from './nullProvider';
import log from '@/lib/logger';

export * from './provider';
export * from './promptBuilder';
export * from './formatter';
export * from './validator';

export function getAiProvider(preferredProvider?: string): AiProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (preferredProvider === 'gemini' && geminiKey) {
    return new GeminiAiProvider();
  }
  if (preferredProvider === 'openai' && openAiKey && !openAiKey.includes('your-openai-key')) {
    return new OpenAiProvider();
  }

  // Automatic provider selection based on configured keys
  if (geminiKey && geminiKey.trim() !== '') {
    log.info({}, 'Selected Gemini as active AI Provider');
    return new GeminiAiProvider();
  }

  if (openAiKey && openAiKey.trim() !== '' && !openAiKey.includes('your-openai-key')) {
    log.info({}, 'Selected OpenAI as active AI Provider');
    return new OpenAiProvider();
  }

  log.info({}, 'No active AI Provider key detected; returning NullAiProvider');
  return new NullAiProvider();
}

export default getAiProvider;
