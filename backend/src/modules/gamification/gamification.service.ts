import { addDaysISO } from '../../shared/utils/date-range.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { ActivityRepository } from '../activity/activity.repository.js';
import type { MeasurementsRepository } from '../measurements/measurements.repository.js';
import type { DailyTargetsRepository } from '../nutrition/daily-targets.repository.js';
import type { NutritionRepository } from '../nutrition/nutrition.repository.js';
import type { SleepRepository } from '../sleep/sleep.repository.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { WorkoutsRepository } from '../workouts/workouts.repository.js';
import type { GamificationRepository } from './gamification.repository.js';
import { currentStreak } from './streaks.js';

const LOOKBACK_DAYS = 90;
const IMPROVEMENT_METRICS = ['weight', 'waist', 'body_fat'];

export interface StreakState {
  current: number;
  longest: number;
}

export interface GamificationState {
  streaks: { tracking: StreakState; sleepGoal: StreakState };
  badges: { key: string; awardedAt: string | null }[];
}

export class GamificationService {
  constructor(
    private readonly gamificationRepository: GamificationRepository,
    private readonly nutritionRepository: NutritionRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly sleepRepository: SleepRepository,
    private readonly workoutsRepository: WorkoutsRepository,
    private readonly measurementsRepository: MeasurementsRepository,
    private readonly dailyTargetsRepository: DailyTargetsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  /** Evaluate-on-read: recompute streaks, persist longest, award any earned badges. */
  async state(userId: string): Promise<GamificationState> {
    const user = await this.usersRepository.findById(userId);
    const today = localDateFor(new Date(), user?.timezone ?? 'UTC');
    const from = addDaysISO(today, -LOOKBACK_DAYS);

    const [meals, activity, sleep, workouts, targets] = await Promise.all([
      this.nutritionRepository.listByLocalDateRange(userId, from, today),
      this.activityRepository.listRange(userId, from, today),
      this.sleepRepository.listRange(userId, from, today),
      this.workoutsRepository.listRange(userId, from, today),
      this.dailyTargetsRepository.effectiveFor(userId, ['sleep_minutes'], today),
    ]);

    // Tracking streak: any log counts.
    const trackedDays = new Set<string>([
      ...meals.map((meal) => meal.localDate),
      ...activity.map((entry) => entry.localDate),
      ...sleep.map((entry) => entry.localDate),
      ...workouts.map((workout) => workout.localDate),
    ]);
    const tracking = currentStreak(trackedDays, today);

    // Sleep-goal streak: nights meeting the current target.
    const sleepTarget = targets.sleep_minutes;
    const sleepGoalDays = new Set<string>(
      sleepTarget !== undefined && sleepTarget > 0
        ? sleep
            .filter((entry) => entry.durationMinutes >= sleepTarget)
            .map((entry) => entry.localDate)
        : [],
    );
    const sleepGoal = currentStreak(sleepGoalDays, today);

    await this.gamificationRepository.saveStreak(userId, 'tracking', tracking, today);
    await this.gamificationRepository.saveStreak(userId, 'sleep_goal', sleepGoal, today);

    // Badge conditions (never revoked once earned).
    const totalSteps = activity.reduce((sum, entry) => sum + entry.steps, 0);
    const earnedNow: string[] = [];
    if (tracking >= 7) earnedNow.push('tracking_7_days');
    if (tracking >= 30) earnedNow.push('tracking_30_days');
    if (sleepGoal >= 7) earnedNow.push('sleep_goal_7_consecutive');
    if (workouts.length >= 10) earnedNow.push('workouts_10');
    if (totalSteps >= 100000) earnedNow.push('steps_100k_total');
    if (await this.hasMeasurementImprovement(userId)) {
      earnedNow.push('first_measurement_improvement');
    }
    for (const key of earnedNow) {
      await this.gamificationRepository.award(userId, key);
    }

    const [definitions, userBadges, trackingRow, sleepRow] = await Promise.all([
      this.gamificationRepository.listBadgeKeys(),
      this.gamificationRepository.listUserBadges(userId),
      this.gamificationRepository.getStreak(userId, 'tracking'),
      this.gamificationRepository.getStreak(userId, 'sleep_goal'),
    ]);
    const awardedByKey = new Map(userBadges.map((badge) => [badge.badgeKey, badge.awardedAt]));

    return {
      streaks: {
        tracking: { current: tracking, longest: trackingRow?.longestCount ?? tracking },
        sleepGoal: { current: sleepGoal, longest: sleepRow?.longestCount ?? sleepGoal },
      },
      badges: definitions.map((key) => ({
        key,
        awardedAt: awardedByKey.get(key)?.toISOString() ?? null,
      })),
    };
  }

  /** Weight, waist, or body fat below its first recorded value. */
  private async hasMeasurementImprovement(userId: string): Promise<boolean> {
    const types = await this.measurementsRepository.listTypesForUser(userId);
    for (const key of IMPROVEMENT_METRICS) {
      const type = types.find((candidate) => candidate.key === key);
      if (!type) continue;
      const rows = await this.measurementsRepository.listByUser(userId, { typeId: type.id });
      if (rows.length < 2) continue;
      const newest = rows[0];
      const oldest = rows[rows.length - 1];
      if (newest && oldest && newest.value < oldest.value) return true;
    }
    return false;
  }
}
