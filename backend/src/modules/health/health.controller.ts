import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/respond.js';

export class HealthController {
  // Arrow-function handlers keep `this` bound when passed to Express.
  getHealth = (_req: Request, res: Response): void => {
    ok(res, { status: 'ok' });
  };
}
