import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/respond.js';
import { currentUser } from '../../shared/utils/current-user.js';
import { permanentDeleteSchema, updateProfileSchema } from './users.schema.js';
import type { UsersService } from './users.service.js';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await this.usersService.getProfile(currentUser(req).id);
    ok(res, { user });
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const input = updateProfileSchema.parse(req.body);
    const user = await this.usersService.updateProfile(currentUser(req).id, input);
    ok(res, { user });
  };

  softDeleteMe = async (req: Request, res: Response): Promise<void> => {
    await this.usersService.softDelete(currentUser(req).id);
    ok(res, { deleted: true });
  };

  permanentDeleteMe = async (req: Request, res: Response): Promise<void> => {
    const input = permanentDeleteSchema.parse(req.body);
    await this.usersService.permanentDelete(currentUser(req).id, input.password);
    ok(res, { deleted: true });
  };
}
