import { Router, type RequestHandler } from 'express';
import type { Request, Response } from 'express';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import type { GamificationService } from './gamification.service.js';

export interface GamificationRoutesDeps {
  gamificationService: GamificationService;
  authMiddleware: RequestHandler;
}

class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  state = async (req: Request, res: Response): Promise<void> => {
    const state = await this.gamificationService.state(currentUser(req).id);
    ok(res, state);
  };
}

export function createGamificationRoutes(deps: GamificationRoutesDeps): Router {
  const controller = new GamificationController(deps.gamificationService);
  const router = Router();

  router.use(deps.authMiddleware);
  router.get('/', controller.state);

  return router;
}
