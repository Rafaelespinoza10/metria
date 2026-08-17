import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import type { InsightsService } from './insights.service.js';

const dailyQuerySchema = z.object({ date: z.string().date().optional() });
const weeklyQuerySchema = z.object({ week: z.string().date().optional() });

export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  daily = async (req: Request, res: Response): Promise<void> => {
    const query = dailyQuerySchema.parse(req.query);
    const insight = await this.insightsService.daily(currentUser(req).id, query.date);
    ok(res, { insight });
  };

  weekly = async (req: Request, res: Response): Promise<void> => {
    const query = weeklyQuerySchema.parse(req.query);
    const insight = await this.insightsService.weekly(currentUser(req).id, query.week);
    ok(res, { insight });
  };
}
