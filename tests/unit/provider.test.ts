import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MistralOcrProvider } from '@/lib/ocr/provider';

describe('MistralOcrProvider REST API Integration Tests', () => {
  let provider: MistralOcrProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    provider = new MistralOcrProvider();
    vi.stubGlobal('fetch', vi.fn());
    process.env = { ...originalEnv, MISTRAL_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('should construct correct Mistral JSON request structure for PDFs using document_url base64', async () => {
    const mockResponse = {
      pages: [
        { markdown: 'Page 1 text content', confidence: 0.98 }
      ]
    };

    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const fileBuffer = Buffer.from('%PDF-1.4 mock content');
    const res = await provider.extract(fileBuffer, 'application/pdf');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = fetchMock.mock.calls[0];

    expect(calledUrl).toBe('https://api.mistral.ai/v1/ocr');
    expect(calledOptions?.method).toBe('POST');
    expect(calledOptions?.headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-api-key',
    });

    const parsedBody = JSON.parse(calledOptions?.body as string);
    expect(parsedBody.model).toBe('mistral-ocr-latest');
    expect(parsedBody.document.type).toBe('document_url');
    expect(parsedBody.document.document_url).toBe(`data:application/pdf;base64,${fileBuffer.toString('base64')}`);
    expect(parsedBody.include_image_base64).toBe(false);

    expect(res.rawOcrText).toBe('Page 1 text content');
    expect(res.confidenceScore).toBe(0.98);
    expect(res.provider).toBe('mistral');
  });

  it('should construct correct request structure for images using image_url base64', async () => {
    const mockResponse = {
      pages: [
        { markdown: 'Image content text', confidence: 0.90 }
      ]
    };

    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const fileBuffer = Buffer.from('image bytes');
    await provider.extract(fileBuffer, 'image/png');

    const [, calledOptions] = fetchMock.mock.calls[0];
    const parsedBody = JSON.parse(calledOptions?.body as string);
    expect(parsedBody.document.type).toBe('image_url');
    expect(parsedBody.document.image_url).toBe(`data:image/png;base64,${fileBuffer.toString('base64')}`);
  });

  it('should join multiple OCR pages correctly', async () => {
    const mockResponse = {
      pages: [
        { markdown: 'Page 1', confidence: 0.9 },
        { text: 'Page 2', confidence: 0.8 },
      ]
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const fileBuffer = Buffer.from('mock file');
    const res = await provider.extract(fileBuffer, 'application/pdf');

    expect(res.rawOcrText).toBe('Page 1\nPage 2');
    expect(res.confidenceScore).toBe(0.85); // average of 0.9 and 0.8
  });

  it('should throw an error if Mistral response contains no text content', async () => {
    const mockResponse = {
      pages: []
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const fileBuffer = Buffer.from('mock file');
    await expect(provider.extract(fileBuffer, 'application/pdf')).rejects.toThrowError(
      /completed but no text could be extracted/
    );
  });

  it('should throw MISTRAL_AUTH_ERROR on 401 response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as any);

    const fileBuffer = Buffer.from('mock file');
    await expect(provider.extract(fileBuffer, 'application/pdf')).rejects.toThrowError(
      /Mistral OCR extraction failed/
    );
  });

  it('should throw MISTRAL_INVALID_REQUEST on 422 response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Unprocessable Entity',
    } as any);

    const fileBuffer = Buffer.from('mock');
    await expect(provider.extract(fileBuffer, 'application/pdf')).rejects.toThrowError(
      /Mistral OCR extraction failed/
    );
  });

  it('should throw MISTRAL_RATE_LIMIT on 429 response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests',
    } as any);

    const fileBuffer = Buffer.from('mock');
    await expect(provider.extract(fileBuffer, 'application/pdf')).rejects.toThrowError(
      /Mistral OCR extraction failed/
    );
  });

  it('should throw MISTRAL_SERVER_ERROR on 500 response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as any);

    const fileBuffer = Buffer.from('mock');
    await expect(provider.extract(fileBuffer, 'application/pdf')).rejects.toThrowError(
      /Mistral OCR extraction failed/
    );
  });

  it('should throw MISTRAL_OCR_TIMEOUT on AbortError timeout', async () => {
    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';

    vi.mocked(fetch).mockRejectedValue(abortError);

    const fileBuffer = Buffer.from('mock');
    await expect(provider.extract(fileBuffer, 'application/pdf')).rejects.toThrowError(
      /request timed out/
    );
  });

  it('should throw MISTRAL_KEY_MISSING if MISTRAL_API_KEY is not defined', async () => {
    delete process.env.MISTRAL_API_KEY;
    const fileBuffer = Buffer.from('mock');
    await expect(provider.extract(fileBuffer, 'application/pdf')).rejects.toThrowError(
      /Mistral API Key is not configured/
    );
  });
});
