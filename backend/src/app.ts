import express from 'express';
import { createHealthRoutes } from './modules/health/health.routes.js';
import { errorHandler } from './shared/middlewares/error-handler.js';
import { notFound } from './shared/middlewares/not-found.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', createHealthRoutes());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
