import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/respond.js';
import { currentUser } from '../../shared/utils/current-user.js';
import { permanentDeleteSchema, updateProfileSchema } from './users.schema.js';
import type { UsersDataService } from './users-data.service.js';
import type { UsersService } from './users.service.js';

export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersDataService: UsersDataService,
  ) {}

  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await this.usersService.getProfile(currentUser(req).id);
    ok(res, { user });
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const input = updateProfileSchema.parse(req.body);
    const user = await this.usersService.updateProfile(currentUser(req).id, input);
    ok(res, { user });
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    const stats = await this.usersDataService.stats(currentUser(req).id);
    ok(res, stats);
  };

  exportData = async (req: Request, res: Response): Promise<void> => {
    const document = await this.usersDataService.exportAll(currentUser(req).id, new Date());
    res.setHeader('Content-Disposition', 'attachment; filename="metria-export.json"');
    ok(res, document);
  };

  importData = async (req: Request, res: Response): Promise<void> => {
    const imported = await this.usersDataService.importAll(currentUser(req).id, req.body);
    ok(res, { imported });
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
