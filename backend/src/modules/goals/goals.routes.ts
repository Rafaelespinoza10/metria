import { Router, type RequestHandler } from 'express';
import { GoalsController } from './goals.controller.js';
import type { GoalsService } from './goals.service.js';

export interface GoalsRoutesDeps {
  goalsService: GoalsService;
  authMiddleware: RequestHandler;
}

export function createGoalsRoutes(deps: GoalsRoutesDeps): Router {
  const controller = new GoalsController(deps.goalsService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.softDelete);

  return router;
}
