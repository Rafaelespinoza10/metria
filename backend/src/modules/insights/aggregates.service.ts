import { addDaysISO } from '../../shared/utils/date-range.js';
import type { ActivityRepository } from '../activity/activity.repository.js';
import type { MeasurementsRepository } from '../measurements/measurements.repository.js';
import type { DailyTargetsRepository } from '../nutrition/daily-targets.repository.js';
import type { NutritionRepository } from '../nutrition/nutrition.repository.js';
import { mealTotals } from '../nutrition/nutrition.service.js';
import type { SleepRepository } from '../sleep/sleep.repository.js';
import type { WorkoutsRepository } from '../workouts/workouts.repository.js';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export interface MetricVsTarget {
  value: number;
  target: number | null;
}

export interface DailyAggregates {
  date: string;
  calories: MetricVsTarget;
  protein: MetricVsTarget;
  steps: MetricVsTarget;
  activeMinutes: MetricVsTarget;
  sleepMinutes: MetricVsTarget;
  workouts: number;
  previous7Days: {
    avgCalories: number | null;
    avgSteps: number | null;
    avgSleepMinutes: number | null;
  };
}

export interface WeekSummary {
  start: string;
  end: string;
  avgCalories: number | null;
  avgProtein: number | null;
  avgSteps: number | null;
  avgSleepMinutes: number | null;
  proteinGoalCompletion: number | null;
  workouts: number;
  weightStart: number | null;
  weightEnd: number | null;
}

export interface WeeklyAggregates {
  current: WeekSummary;
  previous: WeekSummary;
  targets: {
    calories: number | null;
    protein: number | null;
    steps: number | null;
    sleepMinutes: number | null;
  };
}

/** Deterministic aggregate math over range queries. Code calculates; AI interprets. */
export class AggregatesService {
  constructor(
    private readonly nutritionRepository: NutritionRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly sleepRepository: SleepRepository,
    private readonly workoutsRepository: WorkoutsRepository,
    private readonly measurementsRepository: MeasurementsRepository,
    private readonly dailyTargetsRepository: DailyTargetsRepository,
  ) {}

  /** Per-day macro totals within [from, to]. */
  private async dailyMacros(
    userId: string,
    from: string,
    to: string,
  ): Promise<Map<string, { calories: number; protein: number }>> {
    const meals = await this.nutritionRepository.listByLocalDateRange(userId, from, to);
    const byDay = new Map<string, { calories: number; protein: number }>();
    for (const meal of meals) {
      const totals = mealTotals(meal);
      const day = byDay.get(meal.localDate) ?? { calories: 0, protein: 0 };
      day.calories = round1(day.calories + totals.calories);
      day.protein = round1(day.protein + totals.protein);
      byDay.set(meal.localDate, day);
    }
    return byDay;
  }

  async daily(userId: string, date: string): Promise<DailyAggregates> {
    const weekAgo = addDaysISO(date, -7);
    const dayBefore = addDaysISO(date, -1);

    const [macros, activity, sleep, workouts, targets] = await Promise.all([
      this.dailyMacros(userId, weekAgo, date),
      this.activityRepository.listRange(userId, weekAgo, date),
      this.sleepRepository.listRange(userId, weekAgo, date),
      this.workoutsRepository.listRange(userId, date, date),
      this.dailyTargetsRepository.effectiveFor(
        userId,
        ['calories', 'protein', 'steps', 'active_minutes', 'sleep_minutes'],
        date,
      ),
    ]);

    const today = macros.get(date) ?? { calories: 0, protein: 0 };
    const todayActivity = activity.find((entry) => entry.localDate === date);
    const todaySleep = sleep.find((entry) => entry.localDate === date);

    const previousDays = <T extends { localDate: string }>(list: T[]): T[] =>
      list.filter((entry) => entry.localDate >= weekAgo && entry.localDate <= dayBefore);

    return {
      date,
      calories: { value: today.calories, target: targets.calories ?? null },
      protein: { value: today.protein, target: targets.protein ?? null },
      steps: { value: todayActivity?.steps ?? 0, target: targets.steps ?? null },
      activeMinutes: {
        value: todayActivity?.activeMinutes ?? 0,
        target: targets.active_minutes ?? null,
      },
      sleepMinutes: {
        value: todaySleep?.durationMinutes ?? 0,
        target: targets.sleep_minutes ?? null,
      },
      workouts: workouts.length,
      previous7Days: {
        avgCalories: average(
          [...macros.entries()]
            .filter(([day]) => day >= weekAgo && day <= dayBefore)
            .map(([, totals]) => totals.calories),
        ),
        avgSteps: average(previousDays(activity).map((entry) => entry.steps)),
        avgSleepMinutes: average(previousDays(sleep).map((entry) => entry.durationMinutes)),
      },
    };
  }

  private async weekSummary(
    userId: string,
    start: string,
    proteinTarget: number | null,
  ): Promise<WeekSummary> {
    const end = addDaysISO(start, 6);
    const [macros, activity, sleep, workouts, weights] = await Promise.all([
      this.dailyMacros(userId, start, end),
      this.activityRepository.listRange(userId, start, end),
      this.sleepRepository.listRange(userId, start, end),
      this.workoutsRepository.listRange(userId, start, end),
      this.weightsInRange(userId, start, end),
    ]);

    const macroDays = [...macros.values()];
    const trackedProteinDays = macroDays.length;

    return {
      start,
      end,
      avgCalories: average(macroDays.map((day) => day.calories)),
      avgProtein: average(macroDays.map((day) => day.protein)),
      avgSteps: average(activity.map((entry) => entry.steps)),
      avgSleepMinutes: average(sleep.map((entry) => entry.durationMinutes)),
      proteinGoalCompletion:
        proteinTarget !== null && trackedProteinDays > 0
          ? Math.round(
              (macroDays.filter((day) => day.protein >= proteinTarget).length /
                trackedProteinDays) *
                100,
            )
          : null,
      workouts: workouts.length,
      weightStart: weights[0] ?? null,
      weightEnd: weights[weights.length - 1] ?? null,
    };
  }

  /** Weight values in the range, ordered oldest → newest. */
  private async weightsInRange(userId: string, from: string, to: string): Promise<number[]> {
    const types = await this.measurementsRepository.listTypesForUser(userId);
    const weightType = types.find((type) => type.key === 'weight');
    if (!weightType) return [];
    const rows = await this.measurementsRepository.listByUser(userId, {
      typeId: weightType.id,
      from: new Date(`${from}T00:00:00.000Z`),
      to: new Date(`${to}T23:59:59.999Z`),
    });
    // listByUser returns newest first.
    return rows.map((row) => row.value).reverse();
  }

  /** `weekStart` must be a Monday. Targets use the value in effect on the week's last day. */
  async weekly(userId: string, weekStart: string): Promise<WeeklyAggregates> {
    const previousStart = addDaysISO(weekStart, -7);
    const targets = await this.dailyTargetsRepository.effectiveFor(
      userId,
      ['calories', 'protein', 'steps', 'sleep_minutes'],
      addDaysISO(weekStart, 6),
    );
    const proteinTarget = targets.protein ?? null;

    const [current, previous] = await Promise.all([
      this.weekSummary(userId, weekStart, proteinTarget),
      this.weekSummary(userId, previousStart, proteinTarget),
    ]);

    return {
      current,
      previous,
      targets: {
        calories: targets.calories ?? null,
        protein: proteinTarget,
        steps: targets.steps ?? null,
        sleepMinutes: targets.sleep_minutes ?? null,
      },
    };
  }
}
