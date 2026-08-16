import { Router } from 'express';
import { HealthController } from './health.controller.js';

export function createHealthRoutes(): Router {
  const controller = new HealthController();
  const router = Router();

  router.get('/', controller.getHealth);

  return router;
}
