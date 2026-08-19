import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { fail } from '../utils/respond.js';
import { env } from '../../config/env.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error middleware by arity; the parameter must exist.
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    fail(res, err.code, err.message, err.statusCode);
    return;
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    fail(res, 'VALIDATION_ERROR', err.message, status);
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    fail(res, 'VALIDATION_ERROR', message, 400);
    return;
  }

  if (env.NODE_ENV !== 'test') {
    // pino-http attaches req.log (with the request id); fall back to console
    // for the test-injected apps that skip the logging middleware.
    if (req.log) req.log.error({ err }, 'Unhandled error');
    else console.error('Unhandled error:', err);
  }
  fail(res, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
}
