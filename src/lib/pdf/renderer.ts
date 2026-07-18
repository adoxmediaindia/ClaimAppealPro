export interface RenderParams {
  patientName: string;
  insuranceCompany: string;
  claimNumber: string;
  memberId: string;
  policyNumber: string;
  dateOfService: string;
  denialDate: string;
  providerName: string;
  cptCodes: string[];
  icdCodes: string[];
  denialReason: string;
  appealDeadline: string;
  contactInformation: string;
  address: string;
  letterContent: string;
}

export function renderHtmlTemplate(params: RenderParams, templateName: string): string {
  const isProfessional = templateName.toLowerCase() === 'professional';

  // Format arrays for display
  const formattedCpt = params.cptCodes.join(', ') || 'N/A';
  const formattedIcd = params.icdCodes.join(', ') || 'N/A';

  // Format letter paragraphs into clean clinical segments with double line breaks
  const bodyParagraphs = params.letterContent
    .split('\n')
    .filter((p) => p.trim() !== '')
    .map((p) => `<p style="margin-bottom: 1.5em; line-height: 1.65;">${escapeHtml(p)}</p>`)
    .join('');

  const fontStack = isProfessional
    ? "Georgia, 'Times New Roman', Times, serif"
    : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const colorScheme = isProfessional
    ? { primary: '#0f172a', text: '#1e293b', border: '#cbd5e1' }
    : { primary: '#18181b', text: '#27272a', border: '#e4e4e7' };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Insurance Appeal Letter</title>
  <style>
    @page {
      size: letter;
      margin: 1.2in 1in 1.2in 1in;
    }
    body {
      font-family: ${fontStack};
      font-size: 11pt;
      color: ${colorScheme.text};
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .header-container {
      border-bottom: 2px solid ${colorScheme.primary};
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    .grid-info {
      display: table;
      width: 100%;
      margin-bottom: 25px;
      font-size: 9.5pt;
      border-collapse: collapse;
    }
    .grid-row {
      display: table-row;
    }
    .grid-cell {
      display: table-cell;
      padding: 4px 8px;
      width: 50%;
      vertical-align: top;
    }
    .grid-cell-label {
      font-weight: bold;
      color: #475569;
      display: inline-block;
      width: 140px;
    }
    .grid-cell-value {
      color: #0f172a;
    }
    .title {
      font-size: 16pt;
      font-weight: bold;
      color: ${colorScheme.primary};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .appeal-body {
      text-align: justify;
      white-space: pre-wrap;
    }
    .signature-block {
      margin-top: 50px;
      page-break-inside: avoid;
    }
    .signature-line {
      width: 250px;
      border-top: 1px solid ${colorScheme.border};
      margin-top: 40px;
      margin-bottom: 5px;
    }
    .signature-title {
      font-size: 9.5pt;
      color: #64748b;
    }
  </style>
</head>
<body>

  <div class="header-container">
    <div class="title">Formal Insurance Denial Appeal</div>
    <div style="font-size: 10pt; font-weight: bold; color: #475569;">
      Date: ${params.denialDate ? escapeHtml(params.denialDate) : new Date().toLocaleDateString()}
    </div>
  </div>

  <div class="grid-info">
    <div class="grid-row">
      <div class="grid-cell" style="border-right: 1px solid ${colorScheme.border};">
        <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase; color: ${colorScheme.primary}; margin-bottom: 8px;">Patient Information</div>
        <div><span class="grid-cell-label">Patient Name:</span><span class="grid-cell-value">${escapeHtml(params.patientName)}</span></div>
        <div><span class="grid-cell-label">Member ID:</span><span class="grid-cell-value">${escapeHtml(params.memberId)}</span></div>
        <div><span class="grid-cell-label">Policy Number:</span><span class="grid-cell-value">${escapeHtml(params.policyNumber)}</span></div>
        <div><span class="grid-cell-label">Claim Reference:</span><span class="grid-cell-value">${escapeHtml(params.claimNumber)}</span></div>
        <div><span class="grid-cell-label">Date of Service:</span><span class="grid-cell-value">${escapeHtml(params.dateOfService)}</span></div>
      </div>
      <div class="grid-cell" style="padding-left: 20px;">
        <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase; color: ${colorScheme.primary}; margin-bottom: 8px;">Payor & Provider Details</div>
        <div><span class="grid-cell-label">Insurance Payor:</span><span class="grid-cell-value">${escapeHtml(params.insuranceCompany)}</span></div>
        <div><span class="grid-cell-label">Mailing Address:</span><span class="grid-cell-value">${escapeHtml(params.address)}</span></div>
        <div><span class="grid-cell-label">Contact Phone:</span><span class="grid-cell-value">${escapeHtml(params.contactInformation)}</span></div>
        <div><span class="grid-cell-label">Treating Provider:</span><span class="grid-cell-value">${escapeHtml(params.providerName)}</span></div>
        <div><span class="grid-cell-label">Billing Codes:</span><span class="grid-cell-value">${escapeHtml(formattedCpt)} / ${escapeHtml(formattedIcd)}</span></div>
      </div>
    </div>
  </div>

  <div class="appeal-body">
    ${bodyParagraphs}
  </div>

  <div class="signature-block">
    <div class="signature-line"></div>
    <div style="font-weight: bold; color: ${colorScheme.primary};">${escapeHtml(params.providerName)}</div>
    <div class="signature-title">Treating Physician / Representative</div>
    <div style="font-size: 8.5pt; color: #94a3b8; margin-top: 15px;">
      Document generated securely by ClaimAppealPro on behalf of ${escapeHtml(params.patientName)}.
    </div>
  </div>

</body>
</html>
  `.trim();
}

function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
