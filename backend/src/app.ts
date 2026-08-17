import express from 'express';
import { createAuthRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { ConsolePasswordResetMailer, type PasswordResetMailer } from './modules/auth/mailer.js';
import { PasswordResetRepository } from './modules/auth/password-reset.repository.js';
import { TokenService } from './modules/auth/token.service.js';
import { createHealthRoutes } from './modules/health/health.routes.js';
import { UsersRepository } from './modules/users/users.repository.js';
import { createUsersRoutes } from './modules/users/users.routes.js';
import { UsersService } from './modules/users/users.service.js';
import { createAuthMiddleware } from './shared/middlewares/auth.js';
import { errorHandler } from './shared/middlewares/error-handler.js';
import { notFound } from './shared/middlewares/not-found.js';

export interface AppDependencies {
  /** Overridable in tests to capture reset tokens. */
  passwordResetMailer?: PasswordResetMailer;
}

export function createApp(deps: AppDependencies = {}): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Composition root: manual constructor injection, one instance per app.
  const usersRepository = new UsersRepository();
  const passwordResetRepository = new PasswordResetRepository();
  const tokenService = new TokenService();
  const mailer = deps.passwordResetMailer ?? new ConsolePasswordResetMailer();
  const authService = new AuthService(
    usersRepository,
    passwordResetRepository,
    tokenService,
    mailer,
  );
  const usersService = new UsersService(usersRepository);
  const authMiddleware = createAuthMiddleware({ usersRepository, tokenService });

  app.use('/api/health', createHealthRoutes());
  app.use('/api/auth', createAuthRoutes({ authService, authMiddleware }));
  app.use('/api/users', createUsersRoutes({ usersService, authMiddleware }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
