import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import type { ProgressService, TrendsDays } from './progress.service.js';

const dateQuerySchema = z.object({ date: z.string().date().optional() });
const bodyQuerySchema = z.object({
  window: z.enum(['week', '7d', '30d', '90d']).default('week'),
});
const trendsQuerySchema = z.object({
  days: z.enum(['7', '14', '30']).default('7'),
});

export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  score = async (req: Request, res: Response): Promise<void> => {
    const query = dateQuerySchema.parse(req.query);
    const score = await this.progressService.score(currentUser(req).id, query.date);
    ok(res, score);
  };

  today = async (req: Request, res: Response): Promise<void> => {
    const query = dateQuerySchema.parse(req.query);
    const today = await this.progressService.todayPanel(currentUser(req).id, query.date);
    ok(res, today);
  };

  body = async (req: Request, res: Response): Promise<void> => {
    const query = bodyQuerySchema.parse(req.query);
    const body = await this.progressService.body(currentUser(req).id, query.window);
    ok(res, body);
  };

  trends = async (req: Request, res: Response): Promise<void> => {
    const query = trendsQuerySchema.parse(req.query);
    const days = Number(query.days) as TrendsDays;
    const trends = await this.progressService.trends(currentUser(req).id, days);
    ok(res, trends);
  };

  report = async (req: Request, res: Response): Promise<void> => {
    const report = await this.progressService.report(currentUser(req).id);
    ok(res, report);
  };
}
