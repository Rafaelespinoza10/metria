import express from 'express';
import { env } from './config/env.js';
import { createAuthRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { ConsolePasswordResetMailer, type PasswordResetMailer } from './modules/auth/mailer.js';
import { PasswordResetRepository } from './modules/auth/password-reset.repository.js';
import { TokenService } from './modules/auth/token.service.js';
import { createGoalsRoutes } from './modules/goals/goals.routes.js';
import { GoalsRepository } from './modules/goals/goals.repository.js';
import { GoalsService } from './modules/goals/goals.service.js';
import { createHealthRoutes } from './modules/health/health.routes.js';
import { createMeasurementsRoutes } from './modules/measurements/measurements.routes.js';
import { MeasurementsRepository } from './modules/measurements/measurements.repository.js';
import { MeasurementsService } from './modules/measurements/measurements.service.js';
import { createUploadsRoutes } from './modules/uploads/uploads.routes.js';
import { UsersRepository } from './modules/users/users.repository.js';
import { createUsersRoutes } from './modules/users/users.routes.js';
import { UsersService } from './modules/users/users.service.js';
import { createAuthMiddleware } from './shared/middlewares/auth.js';
import { errorHandler } from './shared/middlewares/error-handler.js';
import { notFound } from './shared/middlewares/not-found.js';
import { LocalStorageService } from './shared/storage/local-storage.service.js';
import type { StoragePort } from './shared/storage/storage.port.js';

export interface AppDependencies {
  /** Overridable in tests to capture reset tokens. */
  passwordResetMailer?: PasswordResetMailer;
  /** Overridable in tests to use a temp directory. */
  storage?: StoragePort;
}

export function createApp(deps: AppDependencies = {}): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Composition root: manual constructor injection, one instance per app.
  const storage = deps.storage ?? new LocalStorageService(env.STORAGE_DIR);
  const usersRepository = new UsersRepository();
  const passwordResetRepository = new PasswordResetRepository();
  const goalsRepository = new GoalsRepository();
  const measurementsRepository = new MeasurementsRepository();
  const tokenService = new TokenService();
  const mailer = deps.passwordResetMailer ?? new ConsolePasswordResetMailer();
  const authService = new AuthService(
    usersRepository,
    passwordResetRepository,
    tokenService,
    mailer,
  );
  const usersService = new UsersService(usersRepository, storage);
  const goalsService = new GoalsService(goalsRepository, measurementsRepository);
  const measurementsService = new MeasurementsService(measurementsRepository, storage);
  const authMiddleware = createAuthMiddleware({ usersRepository, tokenService });

  app.use('/api/health', createHealthRoutes());
  app.use('/api/auth', createAuthRoutes({ authService, authMiddleware }));
  app.use('/api/users', createUsersRoutes({ usersService, authMiddleware }));
  app.use('/api/goals', createGoalsRoutes({ goalsService, authMiddleware }));
  app.use('/api/measurements', createMeasurementsRoutes({ measurementsService, authMiddleware }));
  app.use('/api/uploads', createUploadsRoutes({ storage, authMiddleware }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
