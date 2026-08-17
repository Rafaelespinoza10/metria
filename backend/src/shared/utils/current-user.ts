import type { Request } from 'express';
import type { PublicUser } from '../../modules/users/users.types.js';
import { AppError } from '../errors/app-error.js';

/** For handlers behind the auth middleware; throws if it was not applied. */
export function currentUser(req: Request): PublicUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
