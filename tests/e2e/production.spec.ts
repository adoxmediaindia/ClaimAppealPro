import { test, expect } from '@playwright/test';

test.describe('Production Readiness & Hardening E2E Tests', () => {
  test('should verify centralized public health diagnostics route resolves successfully', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health');
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.status).toBe('HEALTHY');
    expect(json.details.database).toBe('ONLINE');
    expect(json.details.openai).toBe('ONLINE');
    expect(json.details.storage).toBe('ONLINE');
  });

  test('should verify strict transport security and frames security headers are active', async ({ request }) => {
    const response = await request.get('http://localhost:3000/');
    const headers = response.headers();

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['permissions-policy']).toContain('camera=()');
  });
});
