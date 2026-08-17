import { Router, type RequestHandler } from 'express';
import { ActivityController } from './activity.controller.js';
import type { ActivityService } from './activity.service.js';

export interface ActivityRoutesDeps {
  activityService: ActivityService;
  authMiddleware: RequestHandler;
}

export function createActivityRoutes(deps: ActivityRoutesDeps): Router {
  const controller = new ActivityController(deps.activityService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/targets', controller.getTargets);
  router.put('/targets', controller.putTargets);
  router.get('/entries', controller.listRange);
  router.get('/entries/:date', controller.getByDate);
  router.put('/entries/:date', controller.put);

  return router;
}
