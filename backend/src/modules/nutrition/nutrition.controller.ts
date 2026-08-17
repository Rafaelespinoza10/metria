import type { Request, Response } from 'express';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import {
  createMealSchema,
  dateQuerySchema,
  putTargetsSchema,
  updateMealSchema,
} from './nutrition.schema.js';
import type { NutritionService } from './nutrition.service.js';

export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  createMeal = async (req: Request, res: Response): Promise<void> => {
    const input = createMealSchema.parse(req.body);
    const meal = await this.nutritionService.createMeal(currentUser(req).id, input);
    ok(res, { meal }, 201);
  };

  listMeals = async (req: Request, res: Response): Promise<void> => {
    const query = dateQuerySchema.parse(req.query);
    const meals = await this.nutritionService.listMeals(currentUser(req).id, query.date);
    ok(res, { meals });
  };

  getMeal = async (req: Request, res: Response): Promise<void> => {
    const meal = await this.nutritionService.getMeal(
      currentUser(req).id,
      String(req.params.id ?? ''),
    );
    ok(res, { meal });
  };

  updateMeal = async (req: Request, res: Response): Promise<void> => {
    const input = updateMealSchema.parse(req.body);
    const meal = await this.nutritionService.updateMeal(
      currentUser(req).id,
      String(req.params.id ?? ''),
      input,
    );
    ok(res, { meal });
  };

  softDeleteMeal = async (req: Request, res: Response): Promise<void> => {
    await this.nutritionService.softDeleteMeal(currentUser(req).id, String(req.params.id ?? ''));
    ok(res, { deleted: true });
  };

  getTargets = async (req: Request, res: Response): Promise<void> => {
    const query = dateQuerySchema.parse(req.query);
    const targets = await this.nutritionService.getTargets(currentUser(req).id, query.date);
    ok(res, { targets });
  };

  putTargets = async (req: Request, res: Response): Promise<void> => {
    const input = putTargetsSchema.parse(req.body);
    const targets = await this.nutritionService.putTargets(currentUser(req).id, input);
    ok(res, { targets });
  };

  daySummary = async (req: Request, res: Response): Promise<void> => {
    const query = dateQuerySchema.parse(req.query);
    const summary = await this.nutritionService.daySummary(currentUser(req).id, query.date);
    ok(res, summary);
  };
}
