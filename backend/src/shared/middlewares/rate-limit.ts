import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';
import { env } from '../../config/env.js';
import type { ErrorEnvelope } from '../utils/respond.js';

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
}

/** Kept under its historical name — existing callers and tests inject it. */
export type AuthRateLimitOptions = RateLimitOptions;

const RATE_LIMITED_BODY: ErrorEnvelope = {
  ok: false,
  error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
};

function limiter(defaults: RateLimitOptions, options?: RateLimitOptions): RequestHandler {
  if (!options && env.NODE_ENV === 'test') {
    return (_req, _res, next) => next();
  }
  return rateLimit({
    windowMs: options?.windowMs ?? defaults.windowMs,
    limit: options?.limit ?? defaults.limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Authenticated routes bucket per user; anonymous traffic falls back to IP
    // (ipKeyGenerator normalizes IPv6 so one host can't rotate through a /64).
    keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (_req, res) => res.status(429).json(RATE_LIMITED_BODY),
  });
}

/** Brute-force guard for credential endpoints. Off in tests unless options are injected. */
export function createAuthRateLimiter(options?: RateLimitOptions): RequestHandler {
  return limiter({ windowMs: 15 * 60 * 1000, limit: 10 }, options);
}

/** Coarse ceiling for the whole API — abuse backstop, not a traffic shaper. */
export function createGlobalRateLimiter(options?: RateLimitOptions): RequestHandler {
  return limiter({ windowMs: 15 * 60 * 1000, limit: 600 }, options);
}

/** Tight per-user quota for routes that spend money on every request (OpenAI calls). */
export function createAiRateLimiter(options?: RateLimitOptions): RequestHandler {
  return limiter({ windowMs: 60 * 60 * 1000, limit: 30 }, options);
}
