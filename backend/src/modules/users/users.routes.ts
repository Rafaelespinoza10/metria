import { Router, type RequestHandler } from 'express';
import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';

export interface UsersRoutesDeps {
  usersService: UsersService;
  authMiddleware: RequestHandler;
}

export function createUsersRoutes(deps: UsersRoutesDeps): Router {
  const controller = new UsersController(deps.usersService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/me', controller.getMe);
  router.patch('/me', controller.updateMe);
  router.delete('/me', controller.softDeleteMe);
  router.delete('/me/permanent', controller.permanentDeleteMe);

  return router;
}
