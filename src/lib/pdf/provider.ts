export interface PdfResult {
  pdfBuffer: Buffer;
  fileSize: number;
}

export interface PdfProviderOptions {
  size: 'letter' | 'a4';
}

export interface PdfProvider {
  generate(htmlContent: string, options?: PdfProviderOptions): Promise<PdfResult>;
}
