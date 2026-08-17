import type { RequestHandler } from 'express';
import type { TokenService } from '../../modules/auth/token.service.js';
import type { UsersRepository } from '../../modules/users/users.repository.js';
import { toPublicUser } from '../../modules/users/users.types.js';
import { AppError } from '../errors/app-error.js';

export interface AuthMiddlewareDeps {
  usersRepository: UsersRepository;
  tokenService: TokenService;
}

export function createAuthMiddleware(deps: AuthMiddlewareDeps): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        throw AppError.unauthorized();
      }
      const payload = deps.tokenService.verify(header.slice('Bearer '.length));
      if (!payload) {
        throw AppError.unauthorized('Invalid or expired token');
      }
      const user = await deps.usersRepository.findById(payload.sub);
      if (!user || user.deletedAt !== null || user.tokenVersion !== payload.tv) {
        throw AppError.unauthorized('Invalid or expired token');
      }
      req.user = toPublicUser(user);
      next();
    } catch (error) {
      next(error);
    }
  };
}
