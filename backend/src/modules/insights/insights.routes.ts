import { Router, type RequestHandler } from 'express';
import { InsightsController } from './insights.controller.js';
import type { InsightsService } from './insights.service.js';

export interface InsightsRoutesDeps {
  insightsService: InsightsService;
  authMiddleware: RequestHandler;
}

export function createInsightsRoutes(deps: InsightsRoutesDeps): Router {
  const controller = new InsightsController(deps.insightsService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/daily', controller.daily);
  router.get('/weekly', controller.weekly);

  return router;
}
