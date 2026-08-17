import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { MealAnalysisController } from './meal-analysis.controller.js';
import type { MealAnalysisService } from './meal-analysis.service.js';
import { NutritionController } from './nutrition.controller.js';
import type { NutritionService } from './nutrition.service.js';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export interface NutritionRoutesDeps {
  nutritionService: NutritionService;
  mealAnalysisService: MealAnalysisService;
  authMiddleware: RequestHandler;
}

export function createNutritionRoutes(deps: NutritionRoutesDeps): Router {
  const controller = new NutritionController(deps.nutritionService);
  const analysisController = new MealAnalysisController(deps.mealAnalysisService);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES },
  });
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/targets', controller.getTargets);
  router.put('/targets', controller.putTargets);
  router.get('/summary', controller.daySummary);
  router.get('/meals', controller.listMeals);
  router.post('/meals', controller.createMeal);
  router.get('/meals/:id', controller.getMeal);
  router.patch('/meals/:id', controller.updateMeal);
  router.delete('/meals/:id', controller.softDeleteMeal);
  router.post('/meals/:id/alternatives', analysisController.alternatives);
  router.post('/analyses', upload.single('photo'), analysisController.analyze);
  router.get('/analyses/:id', analysisController.getById);
  router.post('/analyses/:id/confirm', analysisController.confirm);
  router.post('/analyses/:id/discard', analysisController.discard);

  return router;
}
