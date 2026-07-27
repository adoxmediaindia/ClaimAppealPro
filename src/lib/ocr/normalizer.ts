import { type OcrField, type OcrResult } from './provider';

export interface OcrStructuredData {
  patientName: OcrField<string>;
  insuranceCompany: OcrField<string>;
  claimNumber: OcrField<string>;
  memberId: OcrField<string>;
  policyNumber: OcrField<string>;
  dateOfService: OcrField<string>;
  denialDate: OcrField<string>;
  providerName: OcrField<string>;
  cptCodes: OcrField<string[]>;
  icdCodes: OcrField<string[]>;
  denialReason: OcrField<string>;
  appealDeadline: OcrField<string>;
  contactInformation: OcrField<string>;
  address: OcrField<string>;
  rawOcrText: string;
  confidenceScore: number;
}

export class OcrNormalizer {
  
  /**
   * Cleans white spaces, resolves line break formatting, and extracts structured fields dynamically.
   */
  normalize(rawResult: OcrResult): OcrStructuredData {
    const text = rawResult.rawOcrText;
    const cleanText = this.cleanRawText(text);
    const confidence = rawResult.confidenceScore;

    const config = {
      patient: ['Patient Name', 'Patient\'s Name', 'Patient', 'Member Name', 'Insured Name'],
      insurance: ['Insurance Company', 'Insurance Payor', 'Payor', 'Payer', 'Health Plan', 'Insurance'],
      claim: ['Claim Number', 'Claim #', 'Claim ID', 'Claim No', 'Claim'],
      memberId: ['Member ID', 'Member Number', 'Subscriber ID', 'Policy ID', 'Member'],
      policyNumber: ['Policy Number', 'Policy ID', 'Policy #', 'Policy'],
      dateOfService: ['Date of Service', 'Service Date', 'DOS'],
      denialDate: ['Denial Date', 'Date of Denial', 'Date of Letter', 'Letter Date'],
      provider: ['Provider Name', 'Provider', 'Physician', 'Doctor', 'Facility'],
      denialReason: ['Reason for Denial', 'Denial Reason', 'Reason'],
      appealDeadline: ['Appeal Deadline', 'Deadline', 'Must be submitted by'],
      contactInformation: ['Contact Info', 'Contact Number', 'Phone', 'Telephone', 'Contact'],
      address: ['Mailing Address', 'Address'],
    };

    // Extract fields dynamically using our generic parser
    const patientName = this.extractFieldGeneric(cleanText, config.patient, 'Unknown Patient', confidence);
    const insuranceCompany = this.extractFieldGeneric(cleanText, config.insurance, this.inferInsurance(cleanText), confidence);
    const claimNumber = this.extractFieldGeneric(cleanText, config.claim, 'N/A', confidence);
    const memberId = this.extractFieldGeneric(cleanText, config.memberId, 'N/A', confidence);
    const policyNumber = this.extractFieldGeneric(cleanText, config.policyNumber, 'N/A', confidence);
    
    const dateOfService = this.extractDateFieldGeneric(cleanText, config.dateOfService, confidence);
    const denialDate = this.extractDateFieldGeneric(cleanText, config.denialDate, confidence);
    
    const providerName = this.extractFieldGeneric(cleanText, config.provider, 'Unknown Provider', confidence);
    
    // CPT/ICD code extraction (use lookbehind to exclude claim numbers, zip codes, dates, phone numbers, dollar amounts)
    const cptCodes = this.extractCodes(cleanText, /(?<![-#\w\.\/\$])\b\d{5}\b/g, confidence);
    const icdCodes = this.extractCodes(cleanText, /\b[A-Z]\d{2}(?:\.\d{1,4})?\b/gi, confidence);
    
    const denialReason = this.extractFieldGeneric(cleanText, config.denialReason, this.inferDenialReason(cleanText), confidence);
    const appealDeadline = this.extractDateFieldGeneric(cleanText, config.appealDeadline, confidence);
    
    const contactInformation = this.extractFieldGeneric(cleanText, config.contactInformation, 'N/A', confidence);
    const address = this.extractFieldGeneric(cleanText, config.address, 'N/A', confidence);

    return {
      patientName,
      insuranceCompany,
      claimNumber,
      memberId,
      policyNumber,
      dateOfService,
      denialDate,
      providerName,
      cptCodes,
      icdCodes,
      denialReason,
      appealDeadline,
      contactInformation,
      address,
      rawOcrText: cleanText,
      confidenceScore: confidence,
    };
  }

  /**
   * Cleans duplicates, tabs, double spaces, and standardizes carriage returns.
   */
  private cleanRawText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  private extractFieldGeneric(text: string, labels: string[], fallback: string, defaultConf: number): OcrField<string> {
    // Strip bolding asterisks to normalize markdown bold headers
    const clean = text.replace(/\*/g, '').trim();
    
    for (const label of labels) {
      const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      // Pattern A: Same line separator (colon or pipe)
      const sameLineRegex = new RegExp(`(?:^|[|:|\\s])(?:${escapedLabel})\\s*[|:]\\s*([^\\n\\r|:]+)`, 'i');
      const sameLineMatch = clean.match(sameLineRegex);
      if (sameLineMatch && sameLineMatch[1].trim()) {
        const val = sameLineMatch[1].trim();
        if (val !== 'N/A' && val !== 'Unknown') {
          return {
            value: val,
            confidence: defaultConf,
            sourcePage: 1
          };
        }
      }
      
      // Pattern B: Next line value (separated by newline)
      const multiLineRegex = new RegExp(`(?:^|[|:\\s])(?:${escapedLabel})\\s*\\r?\\n\\s*([^\\n\\r|:]+)`, 'i');
      const multiLineMatch = clean.match(multiLineRegex);
      if (multiLineMatch && multiLineMatch[1].trim()) {
        const val = multiLineMatch[1].trim();
        const isAnotherLabel = /Patient|Member|Claim|Policy|Insurance|Payor|Payer|Plan|Provider|Physician|Doctor|Facility|Date|DOS|CPT|Procedure|Reason/i.test(val);
        if (!isAnotherLabel && val !== 'N/A' && val !== 'Unknown') {
          return {
            value: val,
            confidence: defaultConf,
            sourcePage: 1
          };
        }
      }
    }
    
    return {
      value: fallback,
      confidence: 0.0,
      sourcePage: 1
    };
  }

  private extractDateFieldGeneric(text: string, labels: string[], defaultConf: number): OcrField<string> {
    const rawField = this.extractFieldGeneric(text, labels, 'N/A', defaultConf);
    if (rawField.value && rawField.value !== 'N/A') {
      rawField.value = this.normalizeDateString(rawField.value);
    }
    return rawField;
  }

  private normalizeDateString(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr;
    }
  }

  private extractCodes(text: string, regex: RegExp, defaultConf: number): OcrField<string[]> {
    const matches = text.match(regex);
    const uniqueCodes = matches ? Array.from(new Set(matches.map((m) => m.toUpperCase()))) : [];
    return {
      value: uniqueCodes,
      confidence: uniqueCodes.length > 0 ? defaultConf : 0.0,
      sourcePage: 1,
    };
  }

  private inferInsurance(text: string): string {
    if (/aetna/i.test(text)) return 'Aetna';
    if (/cigna/i.test(text)) return 'Cigna';
    if (/united\s*health/i.test(text)) return 'UnitedHealthcare';
    if (/blue\s*cross|anthem|bcbs/i.test(text)) return 'Blue Cross Blue Shield';
    if (/humana/i.test(text)) return 'Humana';
    return 'Unknown Insurance';
  }

  private inferDenialReason(text: string): string {
    if (/not medically necessary|medical necessity/i.test(text)) {
      return 'Not Medically Necessary';
    }
    if (/experimental|investigational/i.test(text)) {
      return 'Experimental / Investigational Treatment';
    }
    if (/prior authorization|pre-authorization/i.test(text)) {
      return 'Missing Prior Authorization';
    }
    if (/not a covered benefit|not covered/i.test(text)) {
      return 'Non-Covered Benefit';
    }
    return 'Denial Reason unspecified in OCR scans.';
  }
}
