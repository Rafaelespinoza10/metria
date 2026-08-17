import type { Request, Response } from 'express';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import {
  activityDateParamSchema,
  activityRangeQuerySchema,
  putActivityEntrySchema,
  putActivityTargetsSchema,
} from './activity.schema.js';
import type { ActivityService } from './activity.service.js';

export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  getByDate = async (req: Request, res: Response): Promise<void> => {
    const { date } = activityDateParamSchema.parse(req.params);
    const entry = await this.activityService.getByDate(currentUser(req).id, date);
    ok(res, { entry });
  };

  put = async (req: Request, res: Response): Promise<void> => {
    const { date } = activityDateParamSchema.parse(req.params);
    const input = putActivityEntrySchema.parse(req.body);
    const entry = await this.activityService.put(currentUser(req).id, date, input);
    ok(res, { entry });
  };

  listRange = async (req: Request, res: Response): Promise<void> => {
    const { from, to } = activityRangeQuerySchema.parse(req.query);
    const entries = await this.activityService.listRange(currentUser(req).id, from, to);
    ok(res, { entries });
  };

  getTargets = async (req: Request, res: Response): Promise<void> => {
    const targets = await this.activityService.getTargets(currentUser(req).id);
    ok(res, { targets });
  };

  putTargets = async (req: Request, res: Response): Promise<void> => {
    const input = putActivityTargetsSchema.parse(req.body);
    const targets = await this.activityService.putTargets(currentUser(req).id, input);
    ok(res, { targets });
  };
}
