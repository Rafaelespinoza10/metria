import type { Request, Response } from 'express';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import { createGoalSchema, listGoalsQuerySchema, updateGoalSchema } from './goals.schema.js';
import type { GoalsService } from './goals.service.js';

export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createGoalSchema.parse(req.body);
    const goal = await this.goalsService.create(currentUser(req).id, input);
    ok(res, { goal }, 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listGoalsQuerySchema.parse(req.query);
    const goals = await this.goalsService.list(currentUser(req).id, query.status);
    ok(res, { goals });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const goal = await this.goalsService.getById(currentUser(req).id, String(req.params.id ?? ''));
    ok(res, { goal });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = updateGoalSchema.parse(req.body);
    const goal = await this.goalsService.update(
      currentUser(req).id,
      String(req.params.id ?? ''),
      input,
    );
    ok(res, { goal });
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    await this.goalsService.softDelete(currentUser(req).id, String(req.params.id ?? ''));
    ok(res, { deleted: true });
  };
}
