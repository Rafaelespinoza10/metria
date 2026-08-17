import { Router, type RequestHandler } from 'express';
import { WorkoutsController } from './workouts.controller.js';
import type { WorkoutsService } from './workouts.service.js';

export interface WorkoutsRoutesDeps {
  workoutsService: WorkoutsService;
  authMiddleware: RequestHandler;
}

export function createWorkoutsRoutes(deps: WorkoutsRoutesDeps): Router {
  const controller = new WorkoutsController(deps.workoutsService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.softDelete);

  return router;
}
