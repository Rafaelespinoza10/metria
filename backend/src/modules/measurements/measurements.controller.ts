import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import { currentUser } from '../../shared/utils/current-user.js';
import { ok } from '../../shared/utils/respond.js';
import {
  createMeasurementSchema,
  createPhotoBodySchema,
  listMeasurementsQuerySchema,
  updateMeasurementSchema,
} from './measurements.schema.js';
import type { MeasurementsService } from './measurements.service.js';

export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  listTypes = async (req: Request, res: Response): Promise<void> => {
    const types = await this.measurementsService.listTypes(currentUser(req).id);
    ok(res, { types });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createMeasurementSchema.parse(req.body);
    const measurement = await this.measurementsService.create(currentUser(req).id, input);
    ok(res, { measurement }, 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listMeasurementsQuerySchema.parse(req.query);
    const measurements = await this.measurementsService.list(currentUser(req).id, query);
    ok(res, { measurements });
  };

  latest = async (req: Request, res: Response): Promise<void> => {
    const latest = await this.measurementsService.latest(currentUser(req).id);
    ok(res, { latest });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = updateMeasurementSchema.parse(req.body);
    const measurement = await this.measurementsService.update(
      currentUser(req).id,
      String(req.params.id ?? ''),
      input,
    );
    ok(res, { measurement });
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    await this.measurementsService.softDelete(currentUser(req).id, String(req.params.id ?? ''));
    ok(res, { deleted: true });
  };

  uploadPhoto = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw AppError.validation('A "photo" file is required');
    const input = createPhotoBodySchema.parse(req.body);
    const photo = await this.measurementsService.uploadPhoto(
      currentUser(req).id,
      { buffer: req.file.buffer, mimetype: req.file.mimetype },
      input,
    );
    ok(res, { photo }, 201);
  };

  listPhotos = async (req: Request, res: Response): Promise<void> => {
    const photos = await this.measurementsService.listPhotos(currentUser(req).id);
    ok(res, { photos });
  };

  softDeletePhoto = async (req: Request, res: Response): Promise<void> => {
    await this.measurementsService.softDeletePhoto(
      currentUser(req).id,
      String(req.params.id ?? ''),
    );
    ok(res, { deleted: true });
  };
}
