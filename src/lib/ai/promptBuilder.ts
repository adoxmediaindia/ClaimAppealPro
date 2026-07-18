export class PromptBuilder {
  /**
   * Generates a deterministic system prompt based on clinical metadata inputs.
   */
  build(metadata: Record<string, any>, version: string): string {
    const validatedKeys = [
      'patientName',
      'claimNumber',
      'denialReason',
      'denialDate',
      'memberId',
      'policyNumber',
      'cptCodes',
      'icdCodes',
    ];

    const promptParts: string[] = [
      `PROMPT TEMPLATE VERSION: ${version}`,
      'INSTRUCTIONS FOR THE ASSIGNED GENERATOR:',
      'Draft a detailed clinical appeal letter responding to a health insurance denial using the patient metadata fields provided below.',
      '',
      'PATIENT CLINICAL METADATA:',
    ];

    validatedKeys.forEach((key) => {
      const fieldData = metadata[key];
      let resolvedValue = '';
      let shouldInclude = true;

      if (fieldData !== undefined && fieldData !== null) {
        if (typeof fieldData === 'object' && 'value' in fieldData) {
          const confidence = typeof fieldData.confidence === 'number' ? fieldData.confidence : 1.0;
          const confirmed = !!fieldData.confirmed;
          
          // Omit low-confidence values (< 0.85) unless they were explicitly confirmed by the user
          if (confidence < 0.85 && !confirmed) {
            shouldInclude = false;
          } else {
            resolvedValue = String(fieldData.value);
          }
        } else {
          resolvedValue = String(fieldData);
        }
      }

      if (shouldInclude && resolvedValue.trim() !== '') {
        const label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
        promptParts.push(`- ${label}: ${resolvedValue}`);
      }
    });

    promptParts.push(
      '',
      'REQUIRED SECTIONS TO ENFORCE IN JSON OBJECT OUTPUT:',
      '1. "title": A formal subject line containing the claim reference.',
      '2. "executiveSummary": Clear statement of the appeal and requested reversal.',
      '3. "medicalNecessity": Thorough clinical justification for the denied procedures/codes.',
      '4. "policyArgument": Explanation of why the denial contradicts insurer criteria or policy schedules.',
      '5. "supportingEvidence": Checklists of appended physician notes, charts, or clinical guidelines.',
      '6. "closingRequest": Summary of the appeal and direct request for coverage authorization.',
      '',
      'CRITICAL SECURITY & AUTHENTICITY RESTRICTIONS:',
      '- NEVER include placeholder values (e.g., "[Insert Name]", "XX/XX/XXXX").',
      '- NEVER modify dates, claim reference codes, or patient spelling details.',
      '- Do not hallucinate or introduce clinical references that do not correspond to the patient status.'
    );

    return promptParts.join('\n');
  }
}
export default PromptBuilder;
