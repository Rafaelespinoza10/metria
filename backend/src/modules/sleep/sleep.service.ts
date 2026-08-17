import { AppError } from '../../shared/errors/app-error.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { DailyTargetsRepository } from '../nutrition/daily-targets.repository.js';
import type { CreateSleepInput, UpdateSleepInput } from './sleep.schema.js';
import type { SleepEntryRow, SleepRepository } from './sleep.repository.js';

export interface SleepTargets {
  sleep_minutes?: number | undefined;
}

function durationMinutes(bedtime: Date, wakeTime: Date): number {
  return Math.round((wakeTime.getTime() - bedtime.getTime()) / 60000);
}

export class SleepService {
  constructor(
    private readonly sleepRepository: SleepRepository,
    private readonly dailyTargetsRepository: DailyTargetsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  private async userTimezone(userId: string): Promise<string> {
    const user = await this.usersRepository.findById(userId);
    return user?.timezone ?? 'UTC';
  }

  async create(userId: string, input: CreateSleepInput): Promise<SleepEntryRow> {
    const bedtime = new Date(input.bedtime);
    const wakeTime = new Date(input.wakeTime);
    // Entries bucket on the wake-up day in the user's timezone.
    const localDate = localDateFor(wakeTime, await this.userTimezone(userId));

    const existing = await this.sleepRepository.findByDate(userId, localDate);
    if (existing) throw AppError.conflict('Sleep is already logged for this day');

    return this.sleepRepository.create({
      userId,
      bedtime,
      wakeTime,
      durationMinutes: durationMinutes(bedtime, wakeTime),
      localDate,
      quality: input.quality,
      notes: input.notes,
    });
  }

  async list(userId: string, from?: string, to?: string): Promise<SleepEntryRow[]> {
    return this.sleepRepository.listRange(userId, from, to);
  }

  async update(userId: string, id: string, input: UpdateSleepInput): Promise<SleepEntryRow> {
    let timing: Partial<{
      bedtime: Date;
      wakeTime: Date;
      durationMinutes: number;
      localDate: string;
    }> = {};
    if (input.bedtime && input.wakeTime) {
      const bedtime = new Date(input.bedtime);
      const wakeTime = new Date(input.wakeTime);
      timing = {
        bedtime,
        wakeTime,
        durationMinutes: durationMinutes(bedtime, wakeTime),
        localDate: localDateFor(wakeTime, await this.userTimezone(userId)),
      };
    }
    const updated = await this.sleepRepository.update(id, userId, {
      ...timing,
      quality: input.quality,
      notes: input.notes,
    });
    if (!updated) throw AppError.notFound('Sleep entry not found');
    return updated;
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const deleted = await this.sleepRepository.softDelete(id, userId);
    if (!deleted) throw AppError.notFound('Sleep entry not found');
  }

  async getTargets(userId: string): Promise<SleepTargets> {
    const today = localDateFor(new Date(), await this.userTimezone(userId));
    return this.dailyTargetsRepository.effectiveFor(userId, ['sleep_minutes'], today);
  }

  async putTarget(userId: string, sleepMinutes: number): Promise<SleepTargets> {
    const today = localDateFor(new Date(), await this.userTimezone(userId));
    await this.dailyTargetsRepository.upsert(userId, 'sleep_minutes', sleepMinutes, today);
    return this.getTargets(userId);
  }
}
