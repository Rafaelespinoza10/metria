import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { OpenAIInsights, OpenAIMealAlternatives, OpenAIMealVision } from './ai/openai.js';
import type { InsightsPort, MealAlternativesPort, MealVisionPort } from './ai/ports.js';
import { env } from './config/env.js';
import { ActivityRepository } from './modules/activity/activity.repository.js';
import { createActivityRoutes } from './modules/activity/activity.routes.js';
import { ActivityService } from './modules/activity/activity.service.js';
import { createAuthRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { ConsolePasswordResetMailer, type PasswordResetMailer } from './modules/auth/mailer.js';
import { PasswordResetRepository } from './modules/auth/password-reset.repository.js';
import { ProgressScoreService } from './modules/progress/progress-score.service.js';
import { createProgressRoutes } from './modules/progress/progress.routes.js';
import { ProgressService } from './modules/progress/progress.service.js';
import { TokenService } from './modules/auth/token.service.js';
import { GamificationRepository } from './modules/gamification/gamification.repository.js';
import { createGamificationRoutes } from './modules/gamification/gamification.routes.js';
import { GamificationService } from './modules/gamification/gamification.service.js';
import { createGoalsRoutes } from './modules/goals/goals.routes.js';
import { GoalsRepository } from './modules/goals/goals.repository.js';
import { GoalsService } from './modules/goals/goals.service.js';
import { createHealthRoutes } from './modules/health/health.routes.js';
import { AggregatesService } from './modules/insights/aggregates.service.js';
import { InsightsRepository } from './modules/insights/insights.repository.js';
import { createInsightsRoutes } from './modules/insights/insights.routes.js';
import { InsightsService } from './modules/insights/insights.service.js';
import { createMeasurementsRoutes } from './modules/measurements/measurements.routes.js';
import { MeasurementsRepository } from './modules/measurements/measurements.repository.js';
import { MeasurementsService } from './modules/measurements/measurements.service.js';
import { DailyTargetsRepository } from './modules/nutrition/daily-targets.repository.js';
import { MealAnalysisRepository } from './modules/nutrition/meal-analysis.repository.js';
import { MealAnalysisService } from './modules/nutrition/meal-analysis.service.js';
import { createNutritionRoutes } from './modules/nutrition/nutrition.routes.js';
import { SleepRepository } from './modules/sleep/sleep.repository.js';
import { createSleepRoutes } from './modules/sleep/sleep.routes.js';
import { SleepService } from './modules/sleep/sleep.service.js';
import { NutritionRepository } from './modules/nutrition/nutrition.repository.js';
import { NutritionService } from './modules/nutrition/nutrition.service.js';
import { createUploadsRoutes } from './modules/uploads/uploads.routes.js';
import { WorkoutsRepository } from './modules/workouts/workouts.repository.js';
import { createWorkoutsRoutes } from './modules/workouts/workouts.routes.js';
import { WorkoutsService } from './modules/workouts/workouts.service.js';
import { UsersRepository } from './modules/users/users.repository.js';
import { createUsersRoutes } from './modules/users/users.routes.js';
import { UsersService } from './modules/users/users.service.js';
import { createAuthMiddleware } from './shared/middlewares/auth.js';
import {
  createAuthRateLimiter,
  type AuthRateLimitOptions,
} from './shared/middlewares/rate-limit.js';
import { errorHandler } from './shared/middlewares/error-handler.js';
import { notFound } from './shared/middlewares/not-found.js';
import { LocalStorageService } from './shared/storage/local-storage.service.js';
import type { StoragePort } from './shared/storage/storage.port.js';

export interface AppDependencies {
  /** Overridable in tests to capture reset tokens. */
  passwordResetMailer?: PasswordResetMailer;
  /** Overridable in tests to use a temp directory. */
  storage?: StoragePort;
  /** Overridable in tests — the suite never calls OpenAI. */
  mealVision?: MealVisionPort;
  mealAlternatives?: MealAlternativesPort;
  insightsPort?: InsightsPort;
  /** Injectable in tests (limits are off under NODE_ENV=test otherwise). */
  authRateLimit?: AuthRateLimitOptions;
}

export function createApp(deps: AppDependencies = {}): express.Express {
  const app = express();

  app.disable('x-powered-by');
  // JSON API: no HTML is served, so CSP adds nothing here.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    }),
  );
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
  const nutritionRepository = new NutritionRepository();
  const dailyTargetsRepository = new DailyTargetsRepository();
  const sleepRepository = new SleepRepository();
  const workoutsRepository = new WorkoutsRepository();
  const activityRepository = new ActivityRepository();
  const usersService = new UsersService(usersRepository, storage);
  const goalsService = new GoalsService(goalsRepository, measurementsRepository);
  const measurementsService = new MeasurementsService(measurementsRepository, storage);
  const nutritionService = new NutritionService(
    nutritionRepository,
    dailyTargetsRepository,
    usersRepository,
  );
  const activityService = new ActivityService(
    activityRepository,
    dailyTargetsRepository,
    usersRepository,
  );
  const workoutsService = new WorkoutsService(workoutsRepository, usersRepository);
  const mealAnalysisService = new MealAnalysisService(
    new MealAnalysisRepository(),
    nutritionRepository,
    goalsRepository,
    usersRepository,
    storage,
    deps.mealVision ?? new OpenAIMealVision(),
    deps.mealAlternatives ?? new OpenAIMealAlternatives(),
  );
  const sleepService = new SleepService(sleepRepository, dailyTargetsRepository, usersRepository);
  const aggregatesService = new AggregatesService(
    nutritionRepository,
    activityRepository,
    sleepRepository,
    workoutsRepository,
    measurementsRepository,
    dailyTargetsRepository,
  );
  const progressService = new ProgressService(
    new ProgressScoreService(
      nutritionRepository,
      activityRepository,
      sleepRepository,
      workoutsRepository,
      dailyTargetsRepository,
    ),
    aggregatesService,
    measurementsRepository,
    workoutsRepository,
    usersRepository,
  );
  const gamificationService = new GamificationService(
    new GamificationRepository(),
    nutritionRepository,
    activityRepository,
    sleepRepository,
    workoutsRepository,
    measurementsRepository,
    dailyTargetsRepository,
    usersRepository,
  );
  const insightsService = new InsightsService(
    new InsightsRepository(),
    aggregatesService,
    usersRepository,
    deps.insightsPort ?? new OpenAIInsights(),
  );
  const authMiddleware = createAuthMiddleware({ usersRepository, tokenService });

  app.use('/api/health', createHealthRoutes());
  app.use('/api/auth', createAuthRateLimiter(deps.authRateLimit));
  app.use('/api/auth', createAuthRoutes({ authService, authMiddleware }));
  app.use('/api/users', createUsersRoutes({ usersService, authMiddleware }));
  app.use('/api/goals', createGoalsRoutes({ goalsService, authMiddleware }));
  app.use('/api/measurements', createMeasurementsRoutes({ measurementsService, authMiddleware }));
  app.use(
    '/api/nutrition',
    createNutritionRoutes({ nutritionService, mealAnalysisService, authMiddleware }),
  );
  app.use('/api/activity', createActivityRoutes({ activityService, authMiddleware }));
  app.use('/api/workouts', createWorkoutsRoutes({ workoutsService, authMiddleware }));
  app.use('/api/sleep', createSleepRoutes({ sleepService, authMiddleware }));
  app.use('/api/insights', createInsightsRoutes({ insightsService, authMiddleware }));
  app.use('/api/progress', createProgressRoutes({ progressService, authMiddleware }));
  app.use('/api/gamification', createGamificationRoutes({ gamificationService, authMiddleware }));
  app.use('/api/uploads', createUploadsRoutes({ storage, authMiddleware }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
