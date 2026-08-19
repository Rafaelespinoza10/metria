import { Router } from 'express';
import { HealthController } from './health.controller.js';

export function createHealthRoutes(): Router {
  const controller = new HealthController();
  const router = Router();

  router.get('/', controller.getHealth);
  router.get('/ready', controller.getReady);

  return router;
}
