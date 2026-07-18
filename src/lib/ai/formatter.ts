export interface FormatterInput {
  title: string;
  executiveSummary: string;
  medicalNecessity: string;
  policyArgument: string;
  supportingEvidence: string;
  closingRequest: string;
}

export class AppealFormatter {
  /**
   * Compiles structured JSON letter segments into a clean double-spaced clinical document.
   */
  format(input: FormatterInput): string {
    const documentParts = [
      input.title,
      '---',
      'EXECUTIVE SUMMARY',
      input.executiveSummary,
      '---',
      'MEDICAL NECESSITY ARGUMENT',
      input.medicalNecessity,
      '---',
      'POLICY & CONTRACT AGREEMENT ARGUMENT',
      input.policyArgument,
      '---',
      'SUPPORTING EVIDENCE & EXHIBITS CLINICAL CHECKLIST',
      input.supportingEvidence,
      '---',
      'CLOSING SUMMARY & expediting REQUEST',
      input.closingRequest,
    ];

    return documentParts.join('\n\n');
  }
}
export default AppealFormatter;
