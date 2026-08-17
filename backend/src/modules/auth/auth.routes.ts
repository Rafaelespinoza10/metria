import { Router, type RequestHandler } from 'express';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

export interface AuthRoutesDeps {
  authService: AuthService;
  authMiddleware: RequestHandler;
}

export function createAuthRoutes(deps: AuthRoutesDeps): Router {
  const controller = new AuthController(deps.authService);
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/logout', deps.authMiddleware, controller.logout);
  router.post('/forgot-password', controller.forgotPassword);
  router.post('/reset-password', controller.resetPassword);

  return router;
}
