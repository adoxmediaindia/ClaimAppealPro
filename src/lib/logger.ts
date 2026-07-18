import pino from 'pino';

// Define keys containing PII to automatically mask in JSON logs
const piiPaths = [
  'email',
  'firstName',
  'lastName',
  'patientName',
  'npiNumber',
  'clinicName',
  'rawOcrText',
  'letterContent',
];

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: piiPaths,
    censor: '[REDACTED_PII]',
  },
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  aiRequestId?: string;
  stripeEventId?: string;
  durationMs?: number;
  [key: string]: any;
}

export const log = {
  info: (context: LogContext, message: string) => {
    logger.info(context, message);
  },
  error: (context: LogContext, message: string, error?: unknown) => {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      msg: error.message,
      stack: error.stack,
    } : { raw: error };
    
    logger.error({ ...context, error: errorDetails }, message);
  },
  warn: (context: LogContext, message: string) => {
    logger.warn(context, message);
  },
  debug: (context: LogContext, message: string) => {
    logger.debug(context, message);
  },
};

export default log;
