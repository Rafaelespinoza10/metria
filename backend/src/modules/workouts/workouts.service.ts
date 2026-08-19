import { AppError } from '../../shared/errors/app-error.js';
import { IMAGE_EXTENSIONS, sniffImageType } from '../../shared/utils/image-type.js';
import type { StoragePort } from '../../shared/storage/storage.port.js';
import { userKeyPrefix } from '../../shared/storage/storage.port.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { UsersRepository } from '../users/users.repository.js';
import type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  WorkoutsListQuery,
} from './workouts.schema.js';
import type {
  ExerciseWithSets,
  WorkoutWithExercises,
  WorkoutsRepository,
} from './workouts.repository.js';

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
}

export interface ExercisePhoto {
  imageKey: string;
  imageUrl: string;
}

export interface ExerciseResponse extends ExerciseWithSets {
  imageUrl: string | null;
}

export interface WorkoutResponse extends Omit<WorkoutWithExercises, 'exercises'> {
  exercises: ExerciseResponse[];
}

function toWorkoutResponse(workout: WorkoutWithExercises): WorkoutResponse {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      imageUrl: exercise.imageKey ? `/api/uploads/${exercise.imageKey}` : null,
    })),
  };
}

export class WorkoutsService {
  constructor(
    private readonly workoutsRepository: WorkoutsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly storage: StoragePort,
  ) {}

  private async userTimezone(userId: string): Promise<string> {
    const user = await this.usersRepository.findById(userId);
    return user?.timezone ?? 'UTC';
  }

  /** Image keys come from the client; only keys under the user's own prefix are accepted. */
  private assertOwnImageKeys(userId: string, exercises: { imageKey?: string | undefined }[]): void {
    const prefix = userKeyPrefix(userId);
    for (const exercise of exercises) {
      if (exercise.imageKey !== undefined && !exercise.imageKey.startsWith(prefix)) {
        throw AppError.validation('imageKey does not belong to this user');
      }
    }
  }

  async saveExercisePhoto(userId: string, file: UploadedImage): Promise<ExercisePhoto> {
    const imageType = sniffImageType(file.buffer);
    if (!imageType) throw AppError.validation('Only JPEG, PNG, or WebP images are allowed');
    const extension = IMAGE_EXTENSIONS[imageType];
    const stored = await this.storage.save({
      userId,
      folder: 'exercises',
      extension,
      contentType: imageType,
      data: file.buffer,
    });
    return { imageKey: stored.key, imageUrl: `/api/uploads/${stored.key}` };
  }

  async create(userId: string, input: CreateWorkoutInput): Promise<WorkoutResponse> {
    this.assertOwnImageKeys(userId, input.exercises);
    const performedAt = new Date(input.performedAt);
    const workout = await this.workoutsRepository.create({
      userId,
      name: input.name,
      performedAt,
      localDate: localDateFor(performedAt, await this.userTimezone(userId)),
      durationMinutes: input.durationMinutes,
      notes: input.notes,
      exercises: input.exercises,
    });
    return toWorkoutResponse(workout);
  }

  async list(
    userId: string,
    query: WorkoutsListQuery,
  ): Promise<{ workouts: WorkoutResponse[]; total: number; limit: number; offset: number }> {
    const page = await this.workoutsRepository.list(
      userId,
      { from: query.from, to: query.to, search: query.search },
      query.limit,
      query.offset,
    );
    return {
      workouts: page.workouts.map(toWorkoutResponse),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getById(userId: string, id: string): Promise<WorkoutResponse> {
    const workout = await this.workoutsRepository.findByIdForUser(id, userId);
    if (!workout) throw AppError.notFound('Workout not found');
    return toWorkoutResponse(workout);
  }

  async update(userId: string, id: string, input: UpdateWorkoutInput): Promise<WorkoutResponse> {
    if (input.exercises) this.assertOwnImageKeys(userId, input.exercises);
    const performedAt = input.performedAt ? new Date(input.performedAt) : undefined;
    const updated = await this.workoutsRepository.update(id, userId, {
      name: input.name,
      performedAt,
      localDate: performedAt
        ? localDateFor(performedAt, await this.userTimezone(userId))
        : undefined,
      durationMinutes: input.durationMinutes,
      notes: input.notes,
      exercises: input.exercises,
    });
    if (updated) return toWorkoutResponse(updated);
    // Fields-only update (or missing row): refetch to disambiguate and return the tree.
    return this.getById(userId, id);
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const deleted = await this.workoutsRepository.softDelete(id, userId);
    if (!deleted) throw AppError.notFound('Workout not found');
  }
}
