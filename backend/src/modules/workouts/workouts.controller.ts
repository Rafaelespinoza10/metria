import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  workoutsRangeQuerySchema,
} from './workouts.schema.js';
import type { WorkoutsService } from './workouts.service.js';

export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createWorkoutSchema.parse(req.body);
    const workout = await this.workoutsService.create(currentUser(req).id, input);
    ok(res, { workout }, 201);
  };

  uploadExercisePhoto = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw AppError.validation('A "photo" file is required');
    const photo = await this.workoutsService.saveExercisePhoto(currentUser(req).id, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });
    ok(res, { photo }, 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = workoutsRangeQuerySchema.parse(req.query);
    const workouts = await this.workoutsService.list(currentUser(req).id, query.from, query.to);
    ok(res, { workouts });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const workout = await this.workoutsService.getById(
      currentUser(req).id,
      String(req.params.id ?? ''),
    );
    ok(res, { workout });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = updateWorkoutSchema.parse(req.body);
    const workout = await this.workoutsService.update(
      currentUser(req).id,
      String(req.params.id ?? ''),
      input,
    );
    ok(res, { workout });
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    await this.workoutsService.softDelete(currentUser(req).id, String(req.params.id ?? ''));
    ok(res, { deleted: true });
  };
}
