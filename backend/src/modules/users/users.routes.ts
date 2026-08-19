import express, { Router, type RequestHandler } from 'express';
import type { UsersDataService } from './users-data.service.js';
import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';

export interface UsersRoutesDeps {
  usersService: UsersService;
  usersDataService: UsersDataService;
  authMiddleware: RequestHandler;
}

export function createUsersRoutes(deps: UsersRoutesDeps): Router {
  const controller = new UsersController(deps.usersService, deps.usersDataService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/me', controller.getMe);
  router.patch('/me', controller.updateMe);
  router.get('/me/stats', controller.getStats);
  router.get('/me/export', controller.exportData);
  // Backups are far bigger than any other payload, hence the route-specific limit.
  router.post('/me/import', express.json({ limit: '10mb' }), controller.importData);
  router.delete('/me', controller.softDeleteMe);
  router.delete('/me/permanent', controller.permanentDeleteMe);

  return router;
}
