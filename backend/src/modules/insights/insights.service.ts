import { z } from 'zod';
import { env } from '../../config/env.js';
import type { InsightsPort } from '../../ai/ports.js';
import { AppError } from '../../shared/errors/app-error.js';
import { isMonday, mondayOf } from '../../shared/utils/date-range.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { AggregatesService } from './aggregates.service.js';
import type { InsightRow, InsightsRepository } from './insights.repository.js';

const aiInsightSchema = z.object({ content: z.string().min(1).max(1200) });

export class InsightsService {
  constructor(
    private readonly insightsRepository: InsightsRepository,
    private readonly aggregatesService: AggregatesService,
    private readonly usersRepository: UsersRepository,
    private readonly insightsPort: InsightsPort,
  ) {}

  private async userInfo(userId: string): Promise<{ timezone: string; locale: string }> {
    const user = await this.usersRepository.findById(userId);
    return { timezone: user?.timezone ?? 'UTC', locale: user?.locale ?? 'en' };
  }

  /** Cache-or-generate: one AI call per user/period/period_start, ever. */
  private async getOrGenerate(
    userId: string,
    period: 'daily' | 'weekly',
    periodStart: string,
    aggregates: Record<string, unknown>,
    locale: string,
  ): Promise<InsightRow> {
    const cached = await this.insightsRepository.find(userId, period, periodStart);
    if (cached) return cached;

    let raw: unknown;
    try {
      raw = await this.insightsPort.generateInsight({ period, locale, aggregates });
    } catch {
      throw new AppError('AI_UNAVAILABLE', 'Insight generation is unavailable', 503);
    }
    const parsed = aiInsightSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError('AI_UNAVAILABLE', 'AI returned an unusable response', 503);
    }
    return this.insightsRepository.create({
      userId,
      period,
      periodStart,
      aggregates,
      content: parsed.data.content,
      model: env.OPENAI_MODEL,
    });
  }

  async daily(userId: string, date?: string): Promise<InsightRow> {
    const { timezone, locale } = await this.userInfo(userId);
    const today = localDateFor(new Date(), timezone);
    const target = date ?? today;
    if (target > today) throw AppError.validation('date cannot be in the future');

    const aggregates = await this.aggregatesService.daily(userId, target);
    return this.getOrGenerate(
      userId,
      'daily',
      target,
      aggregates as unknown as Record<string, unknown>,
      locale,
    );
  }

  async weekly(userId: string, week?: string): Promise<InsightRow> {
    const { timezone, locale } = await this.userInfo(userId);
    const weekStart = week ?? mondayOf(localDateFor(new Date(), timezone));
    if (!isMonday(weekStart)) throw AppError.validation('week must be a Monday');

    const aggregates = await this.aggregatesService.weekly(userId, weekStart);
    return this.getOrGenerate(
      userId,
      'weekly',
      weekStart,
      aggregates as unknown as Record<string, unknown>,
      locale,
    );
  }
}
