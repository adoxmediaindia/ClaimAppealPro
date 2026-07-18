import { type OcrStructuredData } from './normalizer';

export interface OcrWarning {
  field: string;
  code: 'MISSING_FIELD' | 'LOW_CONFIDENCE' | 'INVALID_DATE' | 'EMPTY_OCR' | 'CORRUPTED';
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ValidationReport {
  isValid: boolean;
  warnings: OcrWarning[];
}

export class OcrValidator {
  
  /**
   * Performs semantic inspections on normalized structured values.
   */
  validate(data: OcrStructuredData): ValidationReport {
    const warnings: OcrWarning[] = [];

    // 1. Check for empty OCR raw text
    if (!data.rawOcrText || data.rawOcrText.trim().length < 50) {
      warnings.push({
        field: 'rawOcrText',
        code: 'EMPTY_OCR',
        message: 'The extracted text is empty or too short. Check if the scan is blurry or corrupted.',
        severity: 'high',
      });
      return { isValid: false, warnings };
    }

    // 2. Validate essential fields presence
    this.checkRequiredString(data.patientName, 'patientName', 'Patient Name', warnings);
    this.checkRequiredString(data.insuranceCompany, 'insuranceCompany', 'Insurance Company Name', warnings);
    this.checkRequiredString(data.denialReason, 'denialReason', 'Denial Reason details', warnings);

    // 3. Validate Date formats and presence
    this.checkDateValidity(data.dateOfService, 'dateOfService', 'Date of Service', warnings);
    this.checkDateValidity(data.denialDate, 'denialDate', 'Denial Date', warnings);

    // 4. Validate Code lists
    if (data.cptCodes.value.length === 0) {
      warnings.push({
        field: 'cptCodes',
        code: 'MISSING_FIELD',
        message: 'No billing CPT codes were identified. Ensure CPT codes are typed on appeal forms.',
        severity: 'low',
      });
    }

    // 5. Overall confidence check
    if (data.confidenceScore < 0.60) {
      warnings.push({
        field: 'confidenceScore',
        code: 'LOW_CONFIDENCE',
        message: `System confidence score is low (${Math.round(data.confidenceScore * 100)}%). Review all fields manually.`,
        severity: 'high',
      });
    }

    const isValid = !warnings.some((w) => w.severity === 'high');

    return {
      isValid,
      warnings,
    };
  }

  private checkRequiredString(
    field: { value: string; confidence: number },
    fieldName: string,
    label: string,
    warnings: OcrWarning[]
  ) {
    if (!field.value || field.value === 'Unknown Patient' || field.value === 'Unknown Insurance' || field.value === 'N/A') {
      warnings.push({
        field: fieldName,
        code: 'MISSING_FIELD',
        message: `${label} could not be identified from the document.`,
        severity: 'medium',
      });
    } else if (field.confidence < 0.70 && field.confidence > 0.0) {
      warnings.push({
        field: fieldName,
        code: 'LOW_CONFIDENCE',
        message: `${label} was extracted with low confidence. Verify value correctness.`,
        severity: 'medium',
      });
    }
  }

  private checkDateValidity(
    field: { value: string; confidence: number },
    fieldName: string,
    label: string,
    warnings: OcrWarning[]
  ) {
    if (!field.value || field.value === 'N/A') {
      warnings.push({
        field: fieldName,
        code: 'MISSING_FIELD',
        message: `${label} could not be found.`,
        severity: 'medium',
      });
    } else if (field.value.includes('/') || field.value.includes('-')) {
      // Validate correct format ISO YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(field.value)) {
        warnings.push({
          field: fieldName,
          code: 'INVALID_DATE',
          message: `${label} date string ("${field.value}") does not match normalized ISO format.`,
          severity: 'medium',
        });
      }
    }
  }
}
