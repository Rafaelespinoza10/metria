import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { WorkoutsController } from './workouts.controller.js';
import type { WorkoutsService } from './workouts.service.js';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export interface WorkoutsRoutesDeps {
  workoutsService: WorkoutsService;
  authMiddleware: RequestHandler;
}

export function createWorkoutsRoutes(deps: WorkoutsRoutesDeps): Router {
  const controller = new WorkoutsController(deps.workoutsService);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES },
  });
  const router = Router();

  router.use(deps.authMiddleware);
  router.post('/exercise-photos', upload.single('photo'), controller.uploadExercisePhoto);
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.softDelete);

  return router;
}
