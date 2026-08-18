import { Router, type RequestHandler } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/app-error.js';
import { ok } from '../../shared/utils/respond.js';
import { BODY_REGIONS, type ExerciseCatalog } from './exercises.catalog.js';

const listQuerySchema = z.object({
  region: z.enum(BODY_REGIONS),
  search: z.string().max(60).optional(),
  level: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export interface ExercisesRoutesDeps {
  catalog: ExerciseCatalog;
  authMiddleware: RequestHandler;
}

class ExercisesController {
  constructor(private readonly catalog: ExerciseCatalog) {}

  regions = (_req: Request, res: Response): void => {
    ok(res, { regions: this.catalog.regions() });
  };

  list = (req: Request, res: Response): void => {
    const query = listQuerySchema.parse(req.query);
    const exercises = this.catalog
      .list(query.region, { search: query.search, level: query.level }, query.limit)
      // Instructions stay out of listings to keep mobile payloads small.
      .map(
        ({ instructions: _instructions, secondaryMuscles: _secondary, ...exercise }) => exercise,
      );
    ok(res, { exercises });
  };

  detail = (req: Request, res: Response): void => {
    const exercise = this.catalog.findById(String(req.params.id ?? ''));
    if (!exercise) throw AppError.notFound('Exercise not found');
    ok(res, { exercise });
  };
}

export function createExercisesRoutes(deps: ExercisesRoutesDeps): Router {
  const controller = new ExercisesController(deps.catalog);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/regions', controller.regions);
  router.get('/', controller.list);
  router.get('/:id', controller.detail);

  return router;
}
