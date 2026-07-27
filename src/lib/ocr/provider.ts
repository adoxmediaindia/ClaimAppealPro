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
  provider: 'mistral' | 'tesseract' | 'native';
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const base64Content = fileBuffer.toString('base64');
      const documentType = mimeType.startsWith('image/') ? 'image_url' : 'document_url';
      const dataUrl = `data:${mimeType};base64,${base64Content}`;

      const requestBody = JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: documentType,
          [documentType]: dataUrl,
        },
        include_image_base64: false,
      });

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        log.error({ correlationId, status: res.status, errorText }, 'Mistral OCR API call failed');
        
        let errorCode = 'MISTRAL_API_ERROR';
        if (res.status === 401 || res.status === 403) {
          errorCode = 'MISTRAL_AUTH_ERROR';
        } else if (res.status === 413) {
          errorCode = 'MISTRAL_PAYLOAD_TOO_LARGE';
        } else if (res.status === 422) {
          errorCode = 'MISTRAL_INVALID_REQUEST';
        } else if (res.status === 429) {
          errorCode = 'MISTRAL_RATE_LIMIT';
        } else if (res.status >= 500) {
          errorCode = 'MISTRAL_SERVER_ERROR';
        }
        
        throw new ApiError(res.status, errorCode, `Mistral OCR extraction failed: ${errorText}`);
      }

      const responseData: any = await res.json();
      
      // Parse raw text aggregated across pages
      const rawOcrText = responseData.pages?.map((p: any) => p.markdown || p.text).join('\n') || '';
      
      if (!rawOcrText.trim()) {
        log.error({ correlationId }, 'Mistral OCR response returned empty text content');
        throw new ApiError(422, 'MISTRAL_EMPTY_RESPONSE', 'Mistral OCR completed but no text could be extracted from the document.');
      }

      // Calculate aggregate confidence score across parsed tokens
      let confidenceScore = 0.95;
      if (responseData.pages && responseData.pages.length > 0) {
        const sum = responseData.pages.reduce((acc: number, p: any) => acc + (p.confidence || 0.95), 0);
        confidenceScore = sum / responseData.pages.length;
        // Round to 4 decimal places to avoid floating point precision issues
        confidenceScore = Math.round(confidenceScore * 10000) / 10000;
      }

      log.info({ correlationId, confidenceScore }, 'Mistral OCR completed successfully');

      return {
        rawOcrText,
        confidenceScore,
        provider: 'mistral',
        processingTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      log.error({ correlationId }, 'Mistral OCR provider extraction threw exception', err);
      if (err.name === 'AbortError') {
        throw new ApiError(504, 'MISTRAL_OCR_TIMEOUT', 'Mistral OCR request timed out after 25 seconds.');
      }
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
