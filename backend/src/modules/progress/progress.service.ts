import { AppError } from '../../shared/errors/app-error.js';
import { addDaysISO, mondayOf } from '../../shared/utils/date-range.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { GamificationRepository } from '../gamification/gamification.repository.js';
import type { MeasurementsRepository } from '../measurements/measurements.repository.js';
import type {
  AggregatesService,
  DailyAggregates,
  DailySeries,
  SeriesMetrics,
} from '../insights/aggregates.service.js';
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

export type TrendsDays = 7 | 14 | 30;

export interface Trends extends DailySeries {
  days: TrendsDays;
  from: string;
  to: string;
}

export interface ProgressReport {
  generatedAt: string;
  period: { from: string; to: string };
  user: { name: string; email: string; memberSince: string };
  score: { score: number; previousScore: number; delta: number };
  averages: SeriesMetrics;
  targets: SeriesMetrics;
  body: BodyProgress;
  tracking: {
    trackedDays: number;
    totalDays: number;
    streak: { current: number; longest: number };
  };
  badges: { earned: number; total: number };
}

const REPORT_DAYS = 30;

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
    private readonly gamificationRepository: GamificationRepository,
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

  /** Per-day series for the last `days` days ending "today" (user timezone). */
  async trends(userId: string, days: TrendsDays): Promise<Trends> {
    const to = await this.today(userId);
    const from = addDaysISO(to, -(days - 1));
    const series = await this.aggregatesService.dailySeries(userId, from, to);
    return { days, from, to, ...series };
  }

  /**
   * Everything the client-rendered PDF report needs for the last 30 days, in one call.
   * Streaks/badges are read from the gamification tables, never recomputed here.
   */
  async report(userId: string): Promise<ProgressReport> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw AppError.unauthorized();

    const to = localDateFor(new Date(), user.timezone ?? 'UTC');
    const from = addDaysISO(to, -(REPORT_DAYS - 1));

    const [score, daily, body, streak, earnedBadges, allBadgeKeys] = await Promise.all([
      this.progressScoreService.score(userId, to),
      this.aggregatesService.dailySeries(userId, from, to),
      this.body(userId, '30d'),
      this.gamificationRepository.getStreak(userId, 'tracking'),
      this.gamificationRepository.listUserBadges(userId),
      this.gamificationRepository.listBadgeKeys(),
    ]);

    return {
      generatedAt: to,
      period: { from, to },
      user: {
        name: user.name,
        email: user.email,
        memberSince: user.createdAt.toISOString().slice(0, 10),
      },
      score: { score: score.score, previousScore: score.previousScore, delta: score.delta },
      averages: daily.averages,
      targets: daily.targets,
      body,
      tracking: {
        trackedDays: daily.series.filter((entry) => entry.tracked).length,
        totalDays: REPORT_DAYS,
        streak: { current: streak?.currentCount ?? 0, longest: streak?.longestCount ?? 0 },
      },
      badges: { earned: earnedBadges.length, total: allBadgeKeys.length },
    };
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
