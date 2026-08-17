import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { MeasurementsController } from './measurements.controller.js';
import type { MeasurementsService } from './measurements.service.js';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export interface MeasurementsRoutesDeps {
  measurementsService: MeasurementsService;
  authMiddleware: RequestHandler;
}

export function createMeasurementsRoutes(deps: MeasurementsRoutesDeps): Router {
  const controller = new MeasurementsController(deps.measurementsService);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES },
  });
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/types', controller.listTypes);
  router.get('/latest', controller.latest);
  router.get('/photos', controller.listPhotos);
  router.post('/photos', upload.single('photo'), controller.uploadPhoto);
  router.delete('/photos/:id', controller.softDeletePhoto);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.softDelete);

  return router;
}
