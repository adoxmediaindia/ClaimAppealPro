import log from '@/lib/logger';

// Statically require the bundled build of PDFJS to avoid dynamic resolution errors in webpack / Next.js output tracing
const PDFJS = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');

export interface PdfParseResult {
  numpages: number;
  numrender: number;
  info: any;
  metadata: any;
  text: string;
  version: string;
}

function renderPage(pageData: any): Promise<string> {
  const renderOptions = {
    normalizeWhitespace: false,
    disableCombineTextItems: false
  };

  return pageData.getTextContent(renderOptions)
    .then(function(textContent: any) {
      let lastY: number | undefined;
      let text = '';
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      return text;
    });
}

export async function parsePdf(dataBuffer: Buffer): Promise<PdfParseResult> {
  const correlationId = crypto.randomUUID ? crypto.randomUUID() : 'pdf-parse-uuid';
  log.info({ correlationId }, 'Executing static PDFJS parse handler');

  const ret: PdfParseResult = {
    numpages: 0,
    numrender: 0,
    info: null,
    metadata: null,
    text: '',
    version: PDFJS.version
  };

  PDFJS.disableWorker = true;
  const doc = await PDFJS.getDocument(dataBuffer);
  ret.numpages = doc.numPages;

  const metaData = await doc.getMetadata().catch(() => null);
  ret.info = metaData ? metaData.info : null;
  ret.metadata = metaData ? metaData.metadata : null;

  const counter = doc.numPages;
  ret.text = '';

  for (let i = 1; i <= counter; i++) {
    const pageText = await doc.getPage(i)
      .then((pageData: any) => renderPage(pageData))
      .catch(() => '');

    ret.text = `${ret.text}\n\n${pageText}`;
  }

  ret.numrender = counter;
  doc.destroy();

  return ret;
}
