export interface AppealResult {
  title: string;
  executiveSummary: string;
  medicalNecessity: string;
  policyArgument: string;
  supportingEvidence: string;
  closingRequest: string;
  formattedLetter: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  modelUsed: string;
}

export interface AiProvider {
  generateAppeal(
    metadata: Record<string, any>,
    promptVersion: string
  ): Promise<AppealResult>;
}
