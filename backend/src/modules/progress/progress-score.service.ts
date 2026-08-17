import { addDaysISO } from '../../shared/utils/date-range.js';
import type { ActivityRepository } from '../activity/activity.repository.js';
import type { DailyTargetsRepository } from '../nutrition/daily-targets.repository.js';
import type { NutritionRepository } from '../nutrition/nutrition.repository.js';
import { mealTotals } from '../nutrition/nutrition.service.js';
import type { SleepRepository } from '../sleep/sleep.repository.js';
import type { WorkoutsRepository } from '../workouts/workouts.repository.js';

const WINDOW_DAYS = 7;

// The formula lives HERE and only here (deterministic — never an LLM; Rules 12/13).
const WEIGHTS = {
  nutrition: 0.25,
  activity: 0.25,
  sleep: 0.25,
  consistency: 0.25,
} as const;

export interface ScoreComponents {
  nutrition: number | null;
  activity: number | null;
  sleep: number | null;
  consistency: number | null;
}

export interface ProgressScore {
  date: string;
  score: number;
  previousScore: number;
  delta: number;
  components: ScoreComponents;
}

function capped(value: number, target: number): number {
  return Math.min(value / target, 1);
}

function closeness(value: number, target: number): number {
  return 1 - Math.min(Math.abs(value - target) / target, 1);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export class ProgressScoreService {
  constructor(
    private readonly nutritionRepository: NutritionRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly sleepRepository: SleepRepository,
    private readonly workoutsRepository: WorkoutsRepository,
    private readonly dailyTargetsRepository: DailyTargetsRepository,
  ) {}

  /** Score for the 7-day window ending at `date`, plus the previous window's score. */
  async score(userId: string, date: string): Promise<ProgressScore> {
    const current = await this.windowScore(userId, date);
    const previous = await this.windowScore(userId, addDaysISO(date, -WINDOW_DAYS));
    return {
      date,
      score: current.score,
      previousScore: previous.score,
      delta: current.score - previous.score,
      components: current.components,
    };
  }

  private async windowScore(
    userId: string,
    endDate: string,
  ): Promise<{ score: number; components: ScoreComponents }> {
    const startDate = addDaysISO(endDate, -(WINDOW_DAYS - 1));

    const [meals, activity, sleep, workouts, targets] = await Promise.all([
      this.nutritionRepository.listByLocalDateRange(userId, startDate, endDate),
      this.activityRepository.listRange(userId, startDate, endDate),
      this.sleepRepository.listRange(userId, startDate, endDate),
      this.workoutsRepository.listRange(userId, startDate, endDate),
      this.dailyTargetsRepository.effectiveFor(
        userId,
        ['calories', 'protein', 'steps', 'active_minutes', 'sleep_minutes'],
        endDate,
      ),
    ]);

    // Per-day nutrition totals.
    const macrosByDay = new Map<string, { calories: number; protein: number }>();
    for (const meal of meals) {
      const totals = mealTotals(meal);
      const day = macrosByDay.get(meal.localDate) ?? { calories: 0, protein: 0 };
      day.calories += totals.calories;
      day.protein += totals.protein;
      macrosByDay.set(meal.localDate, day);
    }

    // Nutrition: closeness for calories, capped ratio for protein, on tracked days.
    const nutritionDayScores: number[] = [];
    for (const day of macrosByDay.values()) {
      const parts: number[] = [];
      if (targets.calories !== undefined && targets.calories > 0) {
        parts.push(closeness(day.calories, targets.calories));
      }
      if (targets.protein !== undefined && targets.protein > 0) {
        parts.push(capped(day.protein, targets.protein));
      }
      const dayScore = average(parts);
      if (dayScore !== null) nutritionDayScores.push(dayScore);
    }

    // Activity: capped ratios per tracked day.
    const activityDayScores: number[] = [];
    for (const entry of activity) {
      const parts: number[] = [];
      if (targets.steps !== undefined && targets.steps > 0) {
        parts.push(capped(entry.steps, targets.steps));
      }
      if (targets.active_minutes !== undefined && targets.active_minutes > 0) {
        parts.push(capped(entry.activeMinutes, targets.active_minutes));
      }
      const dayScore = average(parts);
      if (dayScore !== null) activityDayScores.push(dayScore);
    }

    // Sleep: capped duration ratio per tracked night.
    const sleepDayScores: number[] = [];
    if (targets.sleep_minutes !== undefined && targets.sleep_minutes > 0) {
      for (const entry of sleep) {
        sleepDayScores.push(capped(entry.durationMinutes, targets.sleep_minutes));
      }
    }

    // Consistency: days with at least one log of any kind.
    const trackedDays = new Set<string>([
      ...macrosByDay.keys(),
      ...activity.map((entry) => entry.localDate),
      ...sleep.map((entry) => entry.localDate),
      ...workouts.map((workout) => workout.localDate),
    ]);
    const hasAnyData = trackedDays.size > 0;

    const components: ScoreComponents = {
      nutrition: toPercent(average(nutritionDayScores)),
      activity: toPercent(average(activityDayScores)),
      sleep: toPercent(average(sleepDayScores)),
      consistency: hasAnyData ? toPercent(trackedDays.size / WINDOW_DAYS) : null,
    };

    // Weighted average over available components, weights renormalized.
    let weighted = 0;
    let weightSum = 0;
    for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      const component = components[key];
      if (component !== null) {
        weighted += component * WEIGHTS[key];
        weightSum += WEIGHTS[key];
      }
    }
    return {
      score: weightSum > 0 ? Math.round(weighted / weightSum) : 0,
      components,
    };
  }
}

function toPercent(ratio: number | null): number | null {
  return ratio === null ? null : Math.round(ratio * 100);
}
