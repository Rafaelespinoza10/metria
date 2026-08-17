import { and, desc, eq, inArray, isNull, lte } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { dailyTargets } from '../../database/schema/targets.js';

export type DailyTargetRow = typeof dailyTargets.$inferSelect;
export type TargetMetric = DailyTargetRow['metric'];

/** Metric-generic: nutrition uses calories/macros; activity and sleep workflows reuse it
 *  for steps/active_minutes/sleep_minutes. */
export class DailyTargetsRepository {
  private get db() {
    return getDb();
  }

  /** One row per (user, metric, effective_from) — same-day updates overwrite. */
  async upsert(userId: string, metric: TargetMetric, value: number, effectiveFrom: string) {
    await this.db
      .insert(dailyTargets)
      .values({ userId, metric, value, effectiveFrom })
      .onConflictDoUpdate({
        target: [dailyTargets.userId, dailyTargets.metric, dailyTargets.effectiveFrom],
        set: { value, updatedAt: new Date(), deletedAt: null },
      });
  }

  /** The target in effect for `date` per metric: latest effective_from <= date. */
  async effectiveFor(
    userId: string,
    metrics: TargetMetric[],
    date: string,
  ): Promise<Partial<Record<TargetMetric, number>>> {
    if (metrics.length === 0) return {};
    const rows = await this.db
      .select()
      .from(dailyTargets)
      .where(
        and(
          eq(dailyTargets.userId, userId),
          inArray(dailyTargets.metric, metrics),
          lte(dailyTargets.effectiveFrom, date),
          isNull(dailyTargets.deletedAt),
        ),
      )
      .orderBy(dailyTargets.metric, desc(dailyTargets.effectiveFrom));

    const result: Partial<Record<TargetMetric, number>> = {};
    for (const row of rows) {
      if (result[row.metric] === undefined) result[row.metric] = row.value;
    }
    return result;
  }
}
