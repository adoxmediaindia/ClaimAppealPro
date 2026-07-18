import { AppealResult } from './provider';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
}

export class ResponseValidator {
  /**
   * Evaluates AI-generated appeal output against original metadata inputs.
   */
  validate(result: AppealResult, originalMetadata: Record<string, any>): ValidationReport {
    const errors: string[] = [];

    // 1. Required section existence validations
    const requiredKeys: (keyof Omit<AppealResult, 'usage' | 'modelUsed'>)[] = [
      'title',
      'executiveSummary',
      'medicalNecessity',
      'policyArgument',
      'supportingEvidence',
      'closingRequest',
      'formattedLetter',
    ];

    requiredKeys.forEach((key) => {
      const content = result[key];
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        errors.push(`Missing required appeal section: ${key}`);
      }
    });

    // Extract value strings if metadata utilizes object wrappers
    const extractStringValue = (field: any): string => {
      if (field && typeof field === 'object' && 'value' in field) {
        return String(field.value);
      }
      return field ? String(field) : '';
    };

    // 2. Hallucination Guard: Ensure original Patient Name is correctly referenced
    const patientName = extractStringValue(originalMetadata.patientName);
    if (patientName.trim() !== '') {
      const corpusText = [
        result.title,
        result.executiveSummary,
        result.medicalNecessity,
        result.policyArgument,
        result.supportingEvidence,
        result.closingRequest,
      ]
        .join(' ')
        .toLowerCase();

      if (!corpusText.includes(patientName.toLowerCase())) {
        errors.push(
          `Hallucination check failed: Patient name "${patientName}" is missing from the generated appeal body.`
        );
      }
    }

    // 3. Hallucination Guard: Ensure original Claim Number matches subject details
    const claimNumber = extractStringValue(originalMetadata.claimNumber);
    if (claimNumber.trim() !== '') {
      const subjectText = [result.title, result.executiveSummary].join(' ').toLowerCase();
      if (!subjectText.includes(claimNumber.toLowerCase())) {
        errors.push(
          `Hallucination check failed: Claim number reference "${claimNumber}" is missing from header segments.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
export default ResponseValidator;
