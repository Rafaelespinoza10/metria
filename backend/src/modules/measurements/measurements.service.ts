import { AppError } from '../../shared/errors/app-error.js';
import { IMAGE_EXTENSIONS, sniffImageType } from '../../shared/utils/image-type.js';
import type { StoragePort } from '../../shared/storage/storage.port.js';
import type {
  CreateMeasurementInput,
  ListMeasurementsQuery,
  UpdateMeasurementInput,
} from './measurements.schema.js';
import type {
  MeasurementRow,
  MeasurementTypeRow,
  MeasurementsRepository,
  ProgressPhotoRow,
} from './measurements.repository.js';

export interface UploadedPhotoFile {
  buffer: Buffer;
  mimetype: string;
}

export interface PhotoWithUrl extends ProgressPhotoRow {
  fileUrl: string;
}

export interface LatestMeasurement {
  type: MeasurementTypeRow;
  measurement: MeasurementRow;
}

function toPhotoWithUrl(photo: ProgressPhotoRow): PhotoWithUrl {
  return { ...photo, fileUrl: `/api/uploads/${photo.fileKey}` };
}

export class MeasurementsService {
  constructor(
    private readonly measurementsRepository: MeasurementsRepository,
    private readonly storage: StoragePort,
  ) {}

  async listTypes(userId: string): Promise<MeasurementTypeRow[]> {
    return this.measurementsRepository.listTypesForUser(userId);
  }

  async create(userId: string, input: CreateMeasurementInput): Promise<MeasurementRow> {
    const type = await this.measurementsRepository.findTypeForUser(input.typeId, userId);
    if (!type) throw AppError.validation('Unknown measurement type');
    return this.measurementsRepository.create({
      userId,
      typeId: input.typeId,
      value: input.value,
      measuredAt: new Date(input.measuredAt),
      notes: input.notes,
    });
  }

  async list(userId: string, query: ListMeasurementsQuery): Promise<MeasurementRow[]> {
    return this.measurementsRepository.listByUser(userId, {
      typeId: query.typeId,
      from: query.from ? new Date(query.from) : undefined,
      // `to` is an inclusive calendar date: include the whole day.
      to: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
    });
  }

  async latest(userId: string): Promise<LatestMeasurement[]> {
    const [rows, types] = await Promise.all([
      this.measurementsRepository.latestByType(userId),
      this.measurementsRepository.listTypesForUser(userId),
    ]);
    const typesById = new Map(types.map((type) => [type.id, type]));
    return rows.flatMap((measurement) => {
      const type = typesById.get(measurement.typeId);
      return type ? [{ type, measurement }] : [];
    });
  }

  async update(userId: string, id: string, input: UpdateMeasurementInput): Promise<MeasurementRow> {
    const row = await this.measurementsRepository.update(id, userId, {
      value: input.value,
      measuredAt: input.measuredAt ? new Date(input.measuredAt) : undefined,
      notes: input.notes,
    });
    if (!row) throw AppError.notFound('Measurement not found');
    return row;
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const deleted = await this.measurementsRepository.softDelete(id, userId);
    if (!deleted) throw AppError.notFound('Measurement not found');
  }

  async uploadPhoto(
    userId: string,
    file: UploadedPhotoFile,
    input: { takenAt?: string | undefined; notes?: string | undefined },
  ): Promise<PhotoWithUrl> {
    const imageType = sniffImageType(file.buffer);
    if (!imageType) throw AppError.validation('Only JPEG, PNG, or WebP images are allowed');
    const extension = IMAGE_EXTENSIONS[imageType];

    const stored = await this.storage.save({
      userId,
      folder: 'photos',
      extension,
      contentType: imageType,
      data: file.buffer,
    });
    const photo = await this.measurementsRepository.createPhoto({
      userId,
      fileKey: stored.key,
      takenAt: input.takenAt ? new Date(input.takenAt) : new Date(),
      notes: input.notes,
    });
    return toPhotoWithUrl(photo);
  }

  async listPhotos(userId: string): Promise<PhotoWithUrl[]> {
    const photos = await this.measurementsRepository.listPhotos(userId);
    return photos.map(toPhotoWithUrl);
  }

  /** Soft delete keeps the file; permanent account deletion wipes the storage prefix. */
  async softDeletePhoto(userId: string, id: string): Promise<void> {
    const deleted = await this.measurementsRepository.softDeletePhoto(id, userId);
    if (!deleted) throw AppError.notFound('Photo not found');
  }
}
