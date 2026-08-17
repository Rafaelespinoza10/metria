import { Router, type RequestHandler } from 'express';
import { SleepController } from './sleep.controller.js';
import type { SleepService } from './sleep.service.js';

export interface SleepRoutesDeps {
  sleepService: SleepService;
  authMiddleware: RequestHandler;
}

export function createSleepRoutes(deps: SleepRoutesDeps): Router {
  const controller = new SleepController(deps.sleepService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/targets', controller.getTargets);
  router.put('/targets', controller.putTarget);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.softDelete);

  return router;
}
