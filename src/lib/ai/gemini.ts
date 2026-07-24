import { GoogleGenAI } from '@google/genai';
import { AiProvider, AppealResult } from './provider';
import { PromptBuilder } from './promptBuilder';
import { AppealFormatter } from './formatter';
import log from '@/lib/logger';
import { ApiError } from '@/lib/errors';

export class GeminiAiProvider implements AiProvider {
  private model = 'gemini-1.5-flash';
  private client: GoogleGenAI | null = null;

  private isMockMode(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return (
      process.env.NODE_ENV === 'test' ||
      apiKey === 'mock-gemini-key' ||
      (apiKey !== undefined && (apiKey.includes('mock') || apiKey.includes('your-key')))
    );
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === '' || apiKey.includes('your-key')) {
        throw new ApiError(
          400,
          'GEMINI_KEY_MISSING',
          'GEMINI_API_KEY is not configured in environment variables. Please configure the key in Google AI Studio.'
        );
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  async generateAppeal(
    metadata: Record<string, any>,
    promptVersion: string
  ): Promise<AppealResult> {
    const correlationId = crypto.randomUUID();
    log.info({ correlationId, promptVersion }, 'Starting Gemini appeal letter generation');

    const builder = new PromptBuilder();
    const prompt = builder.build(metadata, promptVersion);
    const formatter = new AppealFormatter();

    // Support offline mock mode for testing/local development
    if (this.isMockMode()) {
      log.info({ correlationId }, 'Executing Gemini generation in offline mock mode');
      
      const extractVal = (field: any): string => {
        if (field && typeof field === 'object' && 'value' in field) {
          return String(field.value);
        }
        return field ? String(field) : '';
      };

      const resolvedPatientName = extractVal(metadata.patientName) || 'Patient';
      const resolvedClaimNumber = extractVal(metadata.claimNumber) || 'N/A';
      const resolvedDenialDate = extractVal(metadata.denialDate) || 'recently';

      const mockResult: AppealResult = {
        title: `Insurance Appeal for ${resolvedPatientName} - Claim #${resolvedClaimNumber}`,
        executiveSummary: `This is a formal appeal letter requesting reconsideration of the denial for claim reference #${resolvedClaimNumber} for patient ${resolvedPatientName}. The service was medically necessary.`,
        medicalNecessity: 'The patient presents with clinical indications that strongly warrant the requested therapy. Standard treatments have failed or are contraindicated. Professional guidelines recommend this pathway.',
        policyArgument: 'Under Section 4.2 of the member policy handbook, the requested clinical service matches covered benefits criteria. Pre-authorization criteria are fully met.',
        supportingEvidence: `Exhibits include primary physician notes dated ${resolvedDenialDate} and relevant peer-reviewed clinical articles.`,
        closingRequest: 'We request immediate reversal of this denial and expedited approval for the requested clinical services.',
        formattedLetter: '',
        usage: {
          promptTokens: 150,
          completionTokens: 320,
          totalTokens: 470,
          cost: 0.0001,
        },
        modelUsed: `${this.model} (Mock)`,
      };

      mockResult.formattedLetter = formatter.format(mockResult);
      return mockResult;
    }

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

    let client: GoogleGenAI;
    try {
      client = this.getClient();
    } catch (err: any) {
      log.error({ correlationId, error: err.message }, 'Gemini client initialization failed');
      throw err;
    }

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        log.info({ correlationId, attempt: attempts }, 'Sending content generation request to Gemini');

        // We wrap the SDK call in a 15 second timeout promise
        const responsePromise = client.models.generateContent({
          model: this.model,
          contents: `${systemInstruction}\n\n${prompt}`,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new ApiError(504, 'GEMINI_TIMEOUT', 'Gemini request timed out after 15 seconds.')), 15000)
        );

        const response: any = await Promise.race([responsePromise, timeoutPromise]);

        const rawText = response.text;
        if (!rawText) {
          throw new ApiError(500, 'GEMINI_RESPONSE_EMPTY', 'Gemini returned an empty completion response.');
        }

        // Clean potential code block backticks if present
        const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(cleanedJson);

        const promptTokens = response.usageMetadata?.promptTokenCount || 200;
        const completionTokens = response.usageMetadata?.candidatesTokenCount || 400;
        const totalTokens = response.usageMetadata?.totalTokenCount || (promptTokens + completionTokens);
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
        lastError = error;
        log.warn({ correlationId, attempt: attempts, error: error.message }, 'Gemini appeal generation attempt failed');

        // Identify retryable errors
        const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('ResourceExhausted') || error.errorCode === 'GEMINI_RATE_LIMIT';
        const isServerErr = error.status >= 500 || error.message?.includes('500') || error.message?.includes('InternalServerError') || error.message?.includes('503') || error.message?.includes('504');
        const isTimeout = error.errorCode === 'GEMINI_TIMEOUT' || error.message?.includes('timeout') || error.message?.includes('timed out');

        if (attempts < maxAttempts && (isRateLimit || isServerErr || isTimeout)) {
          // Exponential backoff delay with jitter (2^attempts * 1000 + random jitter)
          const delay = Math.pow(2, attempts) * 1000 + Math.random() * 1000;
          log.info({ correlationId, delay }, `Retrying Gemini generation in ${Math.round(delay)}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    log.error({ correlationId, error: lastError?.message }, 'Gemini appeal generation failed after all attempts');
    if (lastError instanceof ApiError) {
      throw lastError;
    }

    const statusCode = lastError?.status || 500;
    const isRateLimit = statusCode === 429 || lastError?.message?.includes('429') || lastError?.message?.includes('ResourceExhausted');
    const errorCode = isRateLimit ? 'GEMINI_RATE_LIMIT' : 'GEMINI_API_ERROR';
    const message = isRateLimit 
      ? 'Gemini API rate limit exceeded. Please try again in a few moments.' 
      : `Gemini appeal generation failed: ${lastError?.message || 'Unknown error'}`;

    throw new ApiError(statusCode, errorCode, message);
  }
}
