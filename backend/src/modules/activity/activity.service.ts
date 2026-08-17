import { localDateFor } from '../../shared/utils/local-date.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { DailyTargetsRepository } from '../nutrition/daily-targets.repository.js';
import type { ActivityEntryRow, ActivityRepository } from './activity.repository.js';
import type { PutActivityEntryInput, PutActivityTargetsInput } from './activity.schema.js';

export interface ActivityTargets {
  steps?: number | undefined;
  active_minutes?: number | undefined;
}

const ACTIVITY_METRICS = ['steps', 'active_minutes'] as const;

export class ActivityService {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly dailyTargetsRepository: DailyTargetsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  /** Zero-filled entry when the day has no row yet — the client always gets a shape. */
  async getByDate(
    userId: string,
    date: string,
  ): Promise<
    ActivityEntryRow | { localDate: string; steps: number; activeMinutes: number; notes: null }
  > {
    const entry = await this.activityRepository.findByDate(userId, date);
    return entry ?? { localDate: date, steps: 0, activeMinutes: 0, notes: null };
  }

  async put(userId: string, date: string, input: PutActivityEntryInput): Promise<ActivityEntryRow> {
    return this.activityRepository.upsert(userId, date, input);
  }

  async listRange(userId: string, from: string, to: string): Promise<ActivityEntryRow[]> {
    return this.activityRepository.listRange(userId, from, to);
  }

  async getTargets(userId: string): Promise<ActivityTargets> {
    const user = await this.usersRepository.findById(userId);
    const today = localDateFor(new Date(), user?.timezone ?? 'UTC');
    return this.dailyTargetsRepository.effectiveFor(userId, [...ACTIVITY_METRICS], today);
  }

  async putTargets(userId: string, input: PutActivityTargetsInput): Promise<ActivityTargets> {
    const user = await this.usersRepository.findById(userId);
    const today = localDateFor(new Date(), user?.timezone ?? 'UTC');
    if (input.steps !== undefined) {
      await this.dailyTargetsRepository.upsert(userId, 'steps', input.steps, today);
    }
    if (input.activeMinutes !== undefined) {
      await this.dailyTargetsRepository.upsert(
        userId,
        'active_minutes',
        input.activeMinutes,
        today,
      );
    }
    return this.getTargets(userId);
  }
}
