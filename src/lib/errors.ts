import { NextResponse } from 'next/server';
import { log } from './logger';

export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string, public readonly details: any = null) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiError extends BaseError {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    details: any = null
  ) {
    super(message, details);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details: Record<string, string[]> = {}) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}


export class DatabaseError extends ApiError {
  constructor(details: any = null) {
    // Hide deep database internals from client for security
    super(500, 'DATABASE_ERROR', 'A database transaction exception occurred.', details);
  }
}

export class AiError extends ApiError {
  constructor(message: string, details: any = null) {
    super(502, 'AI_SERVICE_ERROR', message, details);
  }
}

export class StripeBillingError extends ApiError {
  constructor(message: string, details: any = null) {
    super(402, 'BILLING_ERROR', message, details);
  }
}

export class ResourceNotFoundError extends ApiError {
  constructor(message: string) {
    super(404, 'RESOURCE_NOT_FOUND', message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access denied.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class ConcurrencyError extends ApiError {
  constructor(message: string) {
    super(409, 'CONCURRENCY_CONFLICT', message);
  }
}

// Global helper formatting errors to standardized response envelopes
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof BaseError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Treat generic/unknown exceptions as 500 Internal Errors
  const genericMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
  log.error({ error: genericMessage }, 'Unhandled generic exception in API route', error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred.',
      },
    },
    { status: 500 }
  );
}

