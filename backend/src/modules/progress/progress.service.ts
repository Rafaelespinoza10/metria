import { AppError } from '../../shared/errors/app-error.js';
import { addDaysISO, mondayOf } from '../../shared/utils/date-range.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { MeasurementsRepository } from '../measurements/measurements.repository.js';
import type { AggregatesService, DailyAggregates } from '../insights/aggregates.service.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { WorkoutsRepository } from '../workouts/workouts.repository.js';
import type { ProgressScore, ProgressScoreService } from './progress-score.service.js';

export type BodyWindow = 'week' | '7d' | '30d' | '90d';

export interface BodyMetricDelta {
  key: string;
  unit: string;
  start: number | null;
  end: number | null;
  delta: number | null;
}

export interface BodyProgress {
  window: BodyWindow;
  metrics: BodyMetricDelta[];
  workouts: { current: number; previous: number };
}

const BODY_METRIC_KEYS = ['weight', 'waist', 'body_fat'] as const;
const WINDOW_DAYS: Record<Exclude<BodyWindow, 'week'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export class ProgressService {
  constructor(
    private readonly progressScoreService: ProgressScoreService,
    private readonly aggregatesService: AggregatesService,
    private readonly measurementsRepository: MeasurementsRepository,
    private readonly workoutsRepository: WorkoutsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  private async today(userId: string): Promise<string> {
    const user = await this.usersRepository.findById(userId);
    return localDateFor(new Date(), user?.timezone ?? 'UTC');
  }

  private async resolveDate(userId: string, date?: string): Promise<string> {
    const today = await this.today(userId);
    if (date && date > today) throw AppError.validation('date cannot be in the future');
    return date ?? today;
  }

  async score(userId: string, date?: string): Promise<ProgressScore> {
    return this.progressScoreService.score(userId, await this.resolveDate(userId, date));
  }

  async todayPanel(userId: string, date?: string): Promise<DailyAggregates> {
    return this.aggregatesService.daily(userId, await this.resolveDate(userId, date));
  }

  /** Values of a measurement type within [from, to], oldest → newest. */
  private async valuesInRange(
    userId: string,
    typeId: string,
    from: string,
    to: string,
  ): Promise<number[]> {
    const rows = await this.measurementsRepository.listByUser(userId, {
      typeId,
      from: new Date(`${from}T00:00:00.000Z`),
      to: new Date(`${to}T23:59:59.999Z`),
    });
    return rows.map((row) => row.value).reverse(); // repository returns newest first
  }

  async body(userId: string, window: BodyWindow): Promise<BodyProgress> {
    const today = await this.today(userId);
    const types = await this.measurementsRepository.listTypesForUser(userId);

    // Comparison ranges: 'week' = latest of previous calendar week vs latest of the
    // current week; day windows = earliest vs latest inside the window.
    let currentFrom: string;
    let currentTo: string;
    let previousFrom: string;
    let previousTo: string;
    if (window === 'week') {
      currentFrom = mondayOf(today);
      currentTo = today;
      previousFrom = addDaysISO(currentFrom, -7);
      previousTo = addDaysISO(currentFrom, -1);
    } else {
      const days = WINDOW_DAYS[window];
      currentFrom = addDaysISO(today, -(days - 1));
      currentTo = today;
      previousFrom = addDaysISO(currentFrom, -days);
      previousTo = addDaysISO(currentFrom, -1);
    }

    const metrics: BodyMetricDelta[] = [];
    for (const key of BODY_METRIC_KEYS) {
      const type = types.find((candidate) => candidate.key === key);
      if (!type) continue;
      const currentValues = await this.valuesInRange(userId, type.id, currentFrom, currentTo);

      let start: number | null;
      let end: number | null;
      if (window === 'week') {
        const previousValues = await this.valuesInRange(userId, type.id, previousFrom, previousTo);
        start = previousValues[previousValues.length - 1] ?? null;
        end = currentValues[currentValues.length - 1] ?? null;
      } else {
        start = currentValues[0] ?? null;
        end = currentValues[currentValues.length - 1] ?? null;
      }

      metrics.push({
        key,
        unit: type.unit,
        start,
        end,
        delta: start !== null && end !== null ? round1(end - start) : null,
      });
    }

    const [currentWorkouts, previousWorkouts] = await Promise.all([
      this.workoutsRepository.listRange(userId, currentFrom, currentTo),
      this.workoutsRepository.listRange(userId, previousFrom, previousTo),
    ]);

    return {
      window,
      metrics,
      workouts: { current: currentWorkouts.length, previous: previousWorkouts.length },
    };
  }
}
