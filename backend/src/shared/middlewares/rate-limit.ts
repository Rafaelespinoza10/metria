import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';
import type { ErrorEnvelope } from '../utils/respond.js';

export interface AuthRateLimitOptions {
  windowMs: number;
  limit: number;
}

const RATE_LIMITED_BODY: ErrorEnvelope = {
  ok: false,
  error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
};

/** Brute-force guard for credential endpoints. Off in tests unless options are injected. */
export function createAuthRateLimiter(options?: AuthRateLimitOptions): RequestHandler {
  if (!options && env.NODE_ENV === 'test') {
    return (_req, _res, next) => next();
  }
  return rateLimit({
    windowMs: options?.windowMs ?? 15 * 60 * 1000,
    limit: options?.limit ?? 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json(RATE_LIMITED_BODY),
  });
}
