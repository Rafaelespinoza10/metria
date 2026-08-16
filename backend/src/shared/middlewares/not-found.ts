import type { Request, Response } from 'express';
import { fail } from '../utils/respond.js';

export function notFound(req: Request, res: Response): void {
  fail(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
}
