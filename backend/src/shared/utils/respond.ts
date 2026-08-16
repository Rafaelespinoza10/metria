import type { Response } from 'express';
import type { ErrorCode } from '../errors/app-error.js';

export interface OkEnvelope<T> {
  ok: true;
  data: T;
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

export function ok<T>(res: Response, data: T, statusCode = 200): void {
  const body: OkEnvelope<T> = { ok: true, data };
  res.status(statusCode).json(body);
}

export function fail(res: Response, code: ErrorCode, message: string, statusCode: number): void {
  const body: ErrorEnvelope = { ok: false, error: { code, message } };
  res.status(statusCode).json(body);
}
