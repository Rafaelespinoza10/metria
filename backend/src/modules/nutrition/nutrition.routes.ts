import { Router, type RequestHandler } from 'express';
import { NutritionController } from './nutrition.controller.js';
import type { NutritionService } from './nutrition.service.js';

export interface NutritionRoutesDeps {
  nutritionService: NutritionService;
  authMiddleware: RequestHandler;
}

export function createNutritionRoutes(deps: NutritionRoutesDeps): Router {
  const controller = new NutritionController(deps.nutritionService);
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

  return router;
}
