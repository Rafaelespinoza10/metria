import { sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { getDb } from '../../database/client.js';
import { fail, ok } from '../../shared/utils/respond.js';

export class HealthController {
  // Arrow-function handlers keep `this` bound when passed to Express.
  getHealth = (_req: Request, res: Response): void => {
    ok(res, { status: 'ok' });
  };

  /** Readiness for load balancers: an instance whose Postgres is gone must stop
   *  receiving traffic, which the constant liveness answer can't express. */
  getReady = async (_req: Request, res: Response): Promise<void> => {
    try {
      await getDb().execute(sql`select 1`);
      ok(res, { db: 'ok' });
    } catch {
      fail(res, 'SERVICE_UNAVAILABLE', 'Database unreachable', 503);
    }
  };
}
