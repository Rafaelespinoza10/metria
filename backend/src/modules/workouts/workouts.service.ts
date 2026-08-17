import { AppError } from '../../shared/errors/app-error.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { CreateWorkoutInput, UpdateWorkoutInput } from './workouts.schema.js';
import type { WorkoutWithExercises, WorkoutsRepository } from './workouts.repository.js';

export class WorkoutsService {
  constructor(
    private readonly workoutsRepository: WorkoutsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  private async userTimezone(userId: string): Promise<string> {
    const user = await this.usersRepository.findById(userId);
    return user?.timezone ?? 'UTC';
  }

  async create(userId: string, input: CreateWorkoutInput): Promise<WorkoutWithExercises> {
    const performedAt = new Date(input.performedAt);
    return this.workoutsRepository.create({
      userId,
      name: input.name,
      performedAt,
      localDate: localDateFor(performedAt, await this.userTimezone(userId)),
      durationMinutes: input.durationMinutes,
      notes: input.notes,
      exercises: input.exercises,
    });
  }

  async list(userId: string, from?: string, to?: string): Promise<WorkoutWithExercises[]> {
    return this.workoutsRepository.listRange(userId, from, to);
  }

  async getById(userId: string, id: string): Promise<WorkoutWithExercises> {
    const workout = await this.workoutsRepository.findByIdForUser(id, userId);
    if (!workout) throw AppError.notFound('Workout not found');
    return workout;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateWorkoutInput,
  ): Promise<WorkoutWithExercises> {
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
    if (updated) return updated;
    // Fields-only update (or missing row): refetch to disambiguate and return the tree.
    return this.getById(userId, id);
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const deleted = await this.workoutsRepository.softDelete(id, userId);
    if (!deleted) throw AppError.notFound('Workout not found');
  }
}
