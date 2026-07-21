import OpenAI from 'openai';
import { AiProvider, AppealResult } from './provider';
import { PromptBuilder } from './promptBuilder';
import { AppealFormatter } from './formatter';
import log from '@/lib/logger';
import { ApiError } from '@/lib/errors';

export class OpenAiProvider implements AiProvider {
  private client: OpenAI | null = null;
  private model = 'gpt-4o';

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.includes('your-openai-key')) {
        throw new ApiError(400, 'OPENAI_KEY_MISSING', 'OPENAI_API_KEY is not configured in environment variables.');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  async generateAppeal(
    metadata: Record<string, any>,
    promptVersion: string
  ): Promise<AppealResult> {
    const correlationId = crypto.randomUUID();
    log.info({ correlationId, promptVersion }, 'Starting OpenAI appeal letter generation');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('your-openai-key')) {
      throw new ApiError(400, 'OPENAI_KEY_MISSING', 'OPENAI_API_KEY is not configured.');
    }

    const builder = new PromptBuilder();
    const prompt = builder.build(metadata, promptVersion);
    const formatter = new AppealFormatter();

    try {
      const client = this.getClient();
      
      const response = await Promise.race([
        client.chat.completions.create({
          model: this.model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an expert clinical coding and health insurance appeal writer.
You write highly detailed, professional, and convincing appeal letters.
You must output ONLY a valid JSON object matching the following structure:
{
  "title": "String title",
  "executiveSummary": "String executive summary block",
  "medicalNecessity": "String detailed medical necessity argument block",
  "policyArgument": "String policy terms block",
  "supportingEvidence": "String supporting documents checklist block",
  "closingRequest": "String closing block requesting reversal"
}
Ensure all keys are populated and no values are empty or truncated.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new ApiError(504, 'OPENAI_TIMEOUT', 'OpenAI request timed out after 15 seconds.')), 15000)
        ),
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new ApiError(500, 'OPENAI_EMPTY_RESPONSE', 'OpenAI returned an empty completion response.');
      }

      const parsed = JSON.parse(content);
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      const promptTokens = usage.prompt_tokens;
      const completionTokens = usage.completion_tokens;
      const totalTokens = usage.total_tokens;
      const cost = (promptTokens * 0.0000025) + (completionTokens * 0.000010);

      const result: AppealResult = {
        title: parsed.title || 'Insurance Appeal Letter',
        executiveSummary: parsed.executiveSummary || '',
        medicalNecessity: parsed.medicalNecessity || '',
        policyArgument: parsed.policyArgument || '',
        supportingEvidence: parsed.supportingEvidence || '',
        closingRequest: parsed.closingRequest || '',
        formattedLetter: '',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
        },
        modelUsed: this.model,
      };

      result.formattedLetter = formatter.format(result);
      log.info({ correlationId, totalTokens, cost }, 'OpenAI appeal letter generation succeeded');
      return result;
    } catch (error: any) {
      log.error({ correlationId, error: error.message }, 'OpenAI appeal generation failed');
      throw error;
    }
  }
}
