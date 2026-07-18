import OpenAI from 'openai';
import { AiProvider, AppealResult } from './provider';
import { PromptBuilder } from './promptBuilder';
import { AppealFormatter } from './formatter';
import log from '@/lib/logger';

export class OpenAiProvider implements AiProvider {
  private client: OpenAI | null = null;
  private model = 'gpt-4o';

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'sk-proj-your-openai-key') {
        log.warn({}, 'Using placeholder or empty OpenAI API Key. Real completions will be mocked.');

      }
      this.client = new OpenAI({ apiKey: apiKey || 'mock-key' });
    }
    return this.client;
  }

  async generateAppeal(
    metadata: Record<string, any>,
    promptVersion: string
  ): Promise<AppealResult> {
    const correlationId = crypto.randomUUID();
    log.info({ correlationId, promptVersion }, 'Starting OpenAI appeal letter generation');

    const builder = new PromptBuilder();
    const prompt = builder.build(metadata, promptVersion);
    const formatter = new AppealFormatter();

    // Offline bypass wrapper for testing / placeholder credentials
    const apiKey = process.env.OPENAI_API_KEY;
    if (
      process.env.NODE_ENV === 'test' ||
      !apiKey ||
      apiKey === 'sk-proj-your-openai-key'
    ) {
      log.info({ correlationId }, 'Executing AI generation in offline mock mode');
      
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
          cost: 0.0035,
        },
        modelUsed: `${this.model} (Mock)`,
      };


      // Compile formatted letter using shared Formatter
      mockResult.formattedLetter = formatter.format(mockResult);
      return mockResult;
    }

    try {
      const client = this.getClient();
      
      // OpenAI Chat Completion with 15-second timeout
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
          setTimeout(() => reject(new Error('OpenAI request timed out after 15 seconds.')), 15000)
        ),
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned an empty completion response.');
      }

      const parsed = JSON.parse(content);
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      // Calculate dynamic gpt-4o cost: $2.50 / 1M input, $10.00 / 1M output
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

      // Compile formatted letter using shared Formatter
      result.formattedLetter = formatter.format(result);

      log.info({ correlationId, totalTokens, cost }, 'OpenAI appeal letter generation succeeded');
      return result;
    } catch (error: any) {
      log.error({ correlationId, error: error.message }, 'OpenAI appeal generation failed');
      throw error;
    }
  }
}
