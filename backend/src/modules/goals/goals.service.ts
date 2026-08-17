import { AppError } from '../../shared/errors/app-error.js';
import type { MeasurementsRepository } from '../measurements/measurements.repository.js';
import type { CreateGoalInput, UpdateGoalInput } from './goals.schema.js';
import type { GoalRow, GoalsRepository } from './goals.repository.js';

export class GoalsService {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly measurementsRepository: MeasurementsRepository,
  ) {}

  async create(userId: string, input: CreateGoalInput): Promise<GoalRow> {
    if (input.measurementTypeId) {
      const type = await this.measurementsRepository.findTypeForUser(
        input.measurementTypeId,
        userId,
      );
      if (!type) throw AppError.validation('Unknown measurement type');
    }
    return this.goalsRepository.create({ userId, ...input });
  }

  async list(userId: string, status?: GoalRow['status']): Promise<GoalRow[]> {
    return this.goalsRepository.listByUser(userId, status);
  }

  async getById(userId: string, id: string): Promise<GoalRow> {
    const goal = await this.goalsRepository.findByIdForUser(id, userId);
    if (!goal) throw AppError.notFound('Goal not found');
    return goal;
  }

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<GoalRow> {
    const goal = await this.goalsRepository.update(id, userId, input);
    if (!goal) throw AppError.notFound('Goal not found');
    return goal;
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const deleted = await this.goalsRepository.softDelete(id, userId);
    if (!deleted) throw AppError.notFound('Goal not found');
  }
}
