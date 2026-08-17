import { and, eq } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { insights } from '../../database/schema/insights.js';

export type InsightRow = typeof insights.$inferSelect;
export type InsightPeriod = InsightRow['period'];

export class InsightsRepository {
  private get db() {
    return getDb();
  }

  async find(
    userId: string,
    period: InsightPeriod,
    periodStart: string,
  ): Promise<InsightRow | undefined> {
    const [row] = await this.db
      .select()
      .from(insights)
      .where(
        and(
          eq(insights.userId, userId),
          eq(insights.period, period),
          eq(insights.periodStart, periodStart),
        ),
      )
      .limit(1);
    return row;
  }

  async create(data: {
    userId: string;
    period: InsightPeriod;
    periodStart: string;
    aggregates: unknown;
    content: string;
    model: string;
  }): Promise<InsightRow> {
    const [row] = await this.db.insert(insights).values(data).returning();
    if (!row) throw new Error('insights insert returned no row');
    return row;
  }
}
