import type { Request, Response } from 'express';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import {
  createSleepSchema,
  putSleepTargetSchema,
  sleepRangeQuerySchema,
  updateSleepSchema,
} from './sleep.schema.js';
import type { SleepService } from './sleep.service.js';

export class SleepController {
  constructor(private readonly sleepService: SleepService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createSleepSchema.parse(req.body);
    const entry = await this.sleepService.create(currentUser(req).id, input);
    ok(res, { entry }, 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = sleepRangeQuerySchema.parse(req.query);
    const entries = await this.sleepService.list(currentUser(req).id, query.from, query.to);
    ok(res, { entries });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = updateSleepSchema.parse(req.body);
    const entry = await this.sleepService.update(
      currentUser(req).id,
      String(req.params.id ?? ''),
      input,
    );
    ok(res, { entry });
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    await this.sleepService.softDelete(currentUser(req).id, String(req.params.id ?? ''));
    ok(res, { deleted: true });
  };

  getTargets = async (req: Request, res: Response): Promise<void> => {
    const targets = await this.sleepService.getTargets(currentUser(req).id);
    ok(res, { targets });
  };

  putTarget = async (req: Request, res: Response): Promise<void> => {
    const input = putSleepTargetSchema.parse(req.body);
    const targets = await this.sleepService.putTarget(currentUser(req).id, input.sleepMinutes);
    ok(res, { targets });
  };
}
