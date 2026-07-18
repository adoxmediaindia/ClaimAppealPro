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
   * Cleans white spaces, resolves line break formatting, and extracts structured fields using regular expressions.
   */
  normalize(rawResult: OcrResult): OcrStructuredData {
    const text = rawResult.rawOcrText;
    const cleanText = this.cleanRawText(text);
    const confidence = rawResult.confidenceScore;

    // 1. Regular expression extractions
    const patientName = this.extractField(cleanText, /(?:Patient Name|Patient|Patient's Name):\s*([A-Za-z\s]+?)(?:\r?\n|Claim|Member|Date|$)/i, 'Unknown Patient', confidence);
    const insuranceCompany = this.extractField(cleanText, /(?:Insurance Company|Insurance|Payor):\s*([A-Za-z0-9\s]+?)(?:\r?\n|Patient|Claim|$)/i, this.inferInsurance(cleanText), confidence);
    const claimNumber = this.extractField(cleanText, /(?:Claim (?:Number|No\.?|ID|#)):\s*([A-Za-z0-9-]+)/i, 'N/A', confidence);
    const memberId = this.extractField(cleanText, /(?:Member (?:ID|Number|No\.?|#)):\s*([A-Za-z0-9-]+)/i, 'N/A', confidence);
    const policyNumber = this.extractField(cleanText, /(?:Policy (?:ID|Number|No\.?|#)):\s*([A-Za-z0-9-]+)/i, 'N/A', confidence);
    
    // Service and Denial Date normalization
    const dateOfService = this.extractDateField(cleanText, /(?:Date of Service|Service Date|DOS):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i, confidence);
    const denialDate = this.extractDateField(cleanText, /(?:Denial Date|Date of Denial|Date of Letter|Date):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i, confidence);
    
    const providerName = this.extractField(cleanText, /(?:Provider Name|Provider|Physician|Doctor|Facility):\s*([A-Za-z\s]+?)(?:\r?\n|NPI|Claim|$)/i, 'Unknown Provider', confidence);
    
    // CPT/ICD code extraction
    const cptCodes = this.extractCodes(cleanText, /\b\d{5}\b/g, confidence);
    const icdCodes = this.extractCodes(cleanText, /\b[A-Z]\d{2}(?:\.\d{1,4})?\b/gi, confidence);
    
    const denialReason = this.extractField(cleanText, /(?:Reason for Denial|Denial Reason|Reason):\s*([^\n\r]+)/i, this.inferDenialReason(cleanText), confidence);
    const appealDeadline = this.extractDateField(cleanText, /(?:Appeal Deadline|Deadline|Must be submitted by):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i, confidence);
    
    const contactInformation = this.extractField(cleanText, /(?:Contact Info|Contact Number|Phone|Telephone):\s*([\d\s()-]+)/i, 'N/A', confidence);
    const address = this.extractField(cleanText, /(?:Mailing Address|Address):\s*([^\n]+)/i, 'N/A', confidence);

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

  private extractField(text: string, regex: RegExp, fallback: string, defaultConf: number): OcrField<string> {
    const match = text.match(regex);
    return {
      value: match ? match[1].trim() : fallback,
      confidence: match ? defaultConf : 0.0,
      sourcePage: 1,
    };
  }

  private extractDateField(text: string, regex: RegExp, defaultConf: number): OcrField<string> {
    const match = text.match(regex);
    let dateVal = 'N/A';
    if (match) {
      dateVal = this.normalizeDateString(match[1].trim());
    }
    return {
      value: dateVal,
      confidence: match ? defaultConf : 0.0,
      sourcePage: 1,
    };
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
