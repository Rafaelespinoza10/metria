import { AppError } from '../../shared/errors/app-error.js';
import type { MeasurementsRepository } from '../measurements/measurements.repository.js';
import type { CreateGoalInput, UpdateGoalInput } from './goals.schema.js';
import type { GoalRow, GoalsRepository } from './goals.repository.js';

export interface GoalProgress {
  /** Latest measurement of the goal's metric. */
  current: number;
  /** 0–100 completion, null when start/target are missing or equal. */
  percent: number | null;
}

export interface GoalWithProgress extends GoalRow {
  /** Computed on read for measurement-backed metrics; null for habit metrics. */
  progress: GoalProgress | null;
}

/** Direction-agnostic completion: works for losing (start > target) and gaining
 *  (start < target) alike, clamped to 0–100. Code calculates (Golden Rule 1). */
export function progressPercent(start: number, target: number, current: number): number | null {
  if (start === target) return null;
  const raw = ((start - current) / (start - target)) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

/** Metrics whose current value is the latest measurement of the same-named type. */
const MEASUREMENT_KEY_METRICS = new Set(['weight', 'body_fat']);

export class GoalsService {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly measurementsRepository: MeasurementsRepository,
  ) {}

  async create(userId: string, input: CreateGoalInput): Promise<GoalWithProgress> {
    if (input.measurementTypeId) {
      const type = await this.measurementsRepository.findTypeForUser(
        input.measurementTypeId,
        userId,
      );
      if (!type) throw AppError.validation('Unknown measurement type');
    }
    const goal = await this.goalsRepository.create({ userId, ...input });
    const [withProgress] = await this.attachProgress(userId, [goal]);
    return withProgress ?? { ...goal, progress: null };
  }

  async list(userId: string, status?: GoalRow['status']): Promise<GoalWithProgress[]> {
    const goals = await this.goalsRepository.listByUser(userId, status);
    return this.attachProgress(userId, goals);
  }

  async getById(userId: string, id: string): Promise<GoalWithProgress> {
    const goal = await this.goalsRepository.findByIdForUser(id, userId);
    if (!goal) throw AppError.notFound('Goal not found');
    const [withProgress] = await this.attachProgress(userId, [goal]);
    return withProgress ?? { ...goal, progress: null };
  }

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<GoalWithProgress> {
    const goal = await this.goalsRepository.update(id, userId, input);
    if (!goal) throw AppError.notFound('Goal not found');
    const [withProgress] = await this.attachProgress(userId, [goal]);
    return withProgress ?? { ...goal, progress: null };
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const deleted = await this.goalsRepository.softDelete(id, userId);
    if (!deleted) throw AppError.notFound('Goal not found');
  }

  /** One latestByType pass enriches every measurement-backed goal in the batch. */
  private async attachProgress(userId: string, goals: GoalRow[]): Promise<GoalWithProgress[]> {
    const measurable = goals.some(
      (goal) =>
        MEASUREMENT_KEY_METRICS.has(goal.metric) ||
        (goal.metric === 'measurement' && goal.measurementTypeId !== null),
    );
    if (!measurable) return goals.map((goal) => ({ ...goal, progress: null }));

    const [latest, types] = await Promise.all([
      this.measurementsRepository.latestByType(userId),
      this.measurementsRepository.listTypesForUser(userId),
    ]);
    const valueByTypeId = new Map(latest.map((row) => [row.typeId, row.value]));
    const typeIdByKey = new Map(types.map((type) => [type.key, type.id]));

    return goals.map((goal) => {
      const typeId =
        goal.metric === 'measurement'
          ? goal.measurementTypeId
          : MEASUREMENT_KEY_METRICS.has(goal.metric)
            ? (typeIdByKey.get(goal.metric) ?? null)
            : null;
      const current = typeId !== null ? valueByTypeId.get(typeId) : undefined;
      if (current === undefined) return { ...goal, progress: null };
      const percent =
        goal.startValue !== null && goal.targetValue !== null
          ? progressPercent(goal.startValue, goal.targetValue, current)
          : null;
      return { ...goal, progress: { current, percent } };
    });
  }
}
