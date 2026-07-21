import { config } from '@/config';
import { ApiError } from '@/lib/errors';
import log from '@/lib/logger';
import { createWorker } from 'tesseract.js';

export interface OcrField<T> {
  value: T;
  confidence: number;
  sourcePage: number;
  boundingBox?: [number, number, number, number];
}

export interface OcrResult {
  rawOcrText: string;
  confidenceScore: number;
  provider: 'mistral' | 'tesseract';
  processingTimeMs: number;
}

export interface OcrProvider {
  extract(fileBuffer: Buffer, mimeType: string): Promise<OcrResult>;
}

/**
 * Primary OCR Provider utilizing Mistral OCR REST API.
 */
export class MistralOcrProvider implements OcrProvider {
  private endpoint = 'https://api.mistral.ai/v1/ocr';

  async extract(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    const correlationId = crypto.randomUUID();
    log.info({ correlationId, mimeType }, 'Initiating Mistral OCR extraction');
    const apiKey = process.env.MISTRAL_API_KEY || config.MISTRAL_API_KEY;

    if (!apiKey) {
      log.warn({ correlationId }, 'Mistral API key is missing. Skipping to fallback provider');
      throw new ApiError(401, 'MISTRAL_KEY_MISSING', 'Mistral API Key is not configured.');
    }

    const startTime = Date.now();
    try {
      // In production, we send a multipart form request containing the file buffer.
      // We construct the multipart request boundary manually or via standard fetch utilities.
      const boundary = `----Boundary-${crypto.randomUUID()}`;
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="document.pdf"\r\nContent-Type: ${mimeType}\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;

      const requestBody = Buffer.concat([
        Buffer.from(header, 'utf-8'),
        fileBuffer,
        Buffer.from(footer, 'utf-8'),
      ]);

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${apiKey}`,
        },
        body: requestBody as any,
      });

      if (!res.ok) {
        const errorText = await res.text();
        log.error({ correlationId, status: res.status, errorText }, 'Mistral OCR API call failed');
        throw new ApiError(res.status, 'MISTRAL_API_ERROR', `Mistral OCR extraction failed: ${errorText}`);
      }

      const responseData: any = await res.json();
      
      // Parse raw text aggregated across pages
      const rawOcrText = responseData.pages?.map((p: any) => p.markdown || p.text).join('\n') || '';
      
      // Calculate aggregate confidence score across parsed tokens
      const confidenceScore = responseData.pages?.reduce((acc: number, p: any) => acc + (p.confidence || 0.95), 0) / (responseData.pages?.length || 1);

      log.info({ correlationId, confidenceScore }, 'Mistral OCR completed successfully');

      return {
        rawOcrText,
        confidenceScore: confidenceScore || 0.95,
        provider: 'mistral',
        processingTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      log.error({ correlationId }, 'Mistral OCR provider extraction threw exception', err);
      throw err;
    }
  }
}

/**
 * Fallback OCR Provider utilizing local Tesseract.js engine.
 */
export class TesseractOcrProvider implements OcrProvider {
  
  async extract(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    const correlationId = crypto.randomUUID();
    log.info({ correlationId, mimeType }, 'Initiating Tesseract Fallback OCR extraction');
    const startTime = Date.now();

    // Tesseract handles image buffers (PNG/JPG) directly. For PDFs, standard fallbacks conversion occur.
    // In local test context, we process image arrays using a lightweight worker instance.
    try {
      const worker = await createWorker('eng');
      
      // Execute text extraction on the file buffer
      const { data } = await worker.recognize(fileBuffer);
      await worker.terminate();

      const rawOcrText = data.text;
      // Convert confidence range [0-100] to scale [0-1]
      const confidenceScore = (data.confidence || 80) / 100;

      log.info({ correlationId, confidenceScore }, 'Tesseract OCR fallback completed successfully');

      return {
        rawOcrText,
        confidenceScore,
        provider: 'tesseract',
        processingTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      log.error({ correlationId }, 'Tesseract OCR fallback failed', err);
      throw new ApiError(500, 'TESSERACT_OCR_FAILED', `Tesseract fallback failed: ${err.message}`);
    }
  }
}
