import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import { createMealSchema } from './nutrition.schema.js';
import type { MealAnalysisService } from './meal-analysis.service.js';

export class MealAnalysisController {
  constructor(private readonly analysisService: MealAnalysisService) {}

  analyze = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw AppError.validation('A "photo" file is required');
    const analysis = await this.analysisService.analyze(currentUser(req).id, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });
    ok(res, { analysis }, 201);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const analysis = await this.analysisService.getById(
      currentUser(req).id,
      String(req.params.id ?? ''),
    );
    ok(res, { analysis });
  };

  confirm = async (req: Request, res: Response): Promise<void> => {
    const input = createMealSchema.parse(req.body);
    const meal = await this.analysisService.confirm(
      currentUser(req).id,
      String(req.params.id ?? ''),
      input,
    );
    ok(res, { meal }, 201);
  };

  discard = async (req: Request, res: Response): Promise<void> => {
    const analysis = await this.analysisService.discard(
      currentUser(req).id,
      String(req.params.id ?? ''),
    );
    ok(res, { analysis });
  };

  alternatives = async (req: Request, res: Response): Promise<void> => {
    const suggestions = await this.analysisService.suggestAlternatives(
      currentUser(req).id,
      String(req.params.id ?? ''),
    );
    ok(res, { suggestions });
  };
}
