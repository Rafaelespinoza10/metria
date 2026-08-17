import { Router, type RequestHandler } from 'express';
import { ProgressController } from './progress.controller.js';
import type { ProgressService } from './progress.service.js';

export interface ProgressRoutesDeps {
  progressService: ProgressService;
  authMiddleware: RequestHandler;
}

export function createProgressRoutes(deps: ProgressRoutesDeps): Router {
  const controller = new ProgressController(deps.progressService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/score', controller.score);
  router.get('/today', controller.today);
  router.get('/body', controller.body);

  return router;
}
