import { AiProvider, AppealResult } from './provider';
import { PromptBuilder } from './promptBuilder';
import { AppealFormatter } from './formatter';
import log from '@/lib/logger';
import { ApiError } from '@/lib/errors';

export class GeminiAiProvider implements AiProvider {
  private model = 'gemini-1.5-flash';

  private getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError(400, 'GEMINI_KEY_MISSING', 'GEMINI_API_KEY is not configured in environment variables.');
    }
    return apiKey;
  }

  async generateAppeal(
    metadata: Record<string, any>,
    promptVersion: string
  ): Promise<AppealResult> {
    const correlationId = crypto.randomUUID();
    log.info({ correlationId, promptVersion }, 'Starting Gemini appeal letter generation');

    const apiKey = this.getApiKey();
    const builder = new PromptBuilder();
    const prompt = builder.build(metadata, promptVersion);
    const formatter = new AppealFormatter();

    const systemInstruction = `You are an expert clinical coding and health insurance appeal writer.
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
Ensure all keys are populated and no values are empty or truncated. Do not include markdown code block formatting like \`\`\`json.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${systemInstruction}\n\n${prompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          }
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        log.error({ correlationId, status: response.status, errText }, 'Gemini API call failed');
        throw new ApiError(response.status, 'GEMINI_API_ERROR', `Gemini API call failed: ${errText}`);
      }

      const data: any = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new ApiError(500, 'GEMINI_RESPONSE_EMPTY', 'Gemini returned an empty completion response.');
      }

      // Clean potential code block backticks if present
      const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleanedJson);

      const promptTokens = data?.usageMetadata?.promptTokenCount || 200;
      const completionTokens = data?.usageMetadata?.candidatesTokenCount || 400;
      const totalTokens = data?.usageMetadata?.totalTokenCount || (promptTokens + completionTokens);
      // Gemini 1.5 Flash cost: ~ $0.000075 / 1k input tokens, $0.0003 / 1k output tokens
      const cost = (promptTokens * 0.000000075) + (completionTokens * 0.0000003);

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
      log.info({ correlationId, totalTokens, cost }, 'Gemini appeal letter generation succeeded');
      return result;
    } catch (error: any) {
      log.error({ correlationId, error: error.message }, 'Gemini appeal generation failed');
      throw error;
    }
  }
}
