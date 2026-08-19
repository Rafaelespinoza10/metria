import { Router, type RequestHandler } from 'express';
import { InsightsController } from './insights.controller.js';
import type { InsightsService } from './insights.service.js';

export interface InsightsRoutesDeps {
  insightsService: InsightsService;
  authMiddleware: RequestHandler;
  /** Per-user quota — cache misses on these routes trigger OpenAI calls. */
  aiLimiter: RequestHandler;
}

export function createInsightsRoutes(deps: InsightsRoutesDeps): Router {
  const controller = new InsightsController(deps.insightsService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/daily', deps.aiLimiter, controller.daily);
  router.get('/weekly', deps.aiLimiter, controller.weekly);

  return router;
}
