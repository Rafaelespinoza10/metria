import { Router, type RequestHandler } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import type { StoragePort } from '../../shared/storage/storage.port.js';
import { userKeyPrefix } from '../../shared/storage/storage.port.js';
import { currentUser } from '../../shared/utils/current-user.js';

export interface UploadsRoutesDeps {
  storage: StoragePort;
  authMiddleware: RequestHandler;
}

/** Auth-gated file serving. A user can only read keys under their own prefix. */
export function createUploadsRoutes(deps: UploadsRoutesDeps): Router {
  const router = Router();

  router.use(deps.authMiddleware);
  router.get(/^\/(.+)$/, async (req, res, next) => {
    try {
      const key = decodeURIComponent(req.path.slice(1));
      if (!key.startsWith(userKeyPrefix(currentUser(req).id))) {
        // 404, not 403: never confirm that a foreign key exists.
        throw AppError.notFound('File not found');
      }
      const file = await deps.storage.stream(key);
      if (!file) throw AppError.notFound('File not found');

      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      file.stream.pipe(res);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
