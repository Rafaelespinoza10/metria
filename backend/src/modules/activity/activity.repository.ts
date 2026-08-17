import { and, asc, between, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { activityEntries } from '../../database/schema/activity.js';

export type ActivityEntryRow = typeof activityEntries.$inferSelect;

export interface UpsertActivityData {
  steps?: number | undefined;
  activeMinutes?: number | undefined;
  notes?: string | null | undefined;
}

export class ActivityRepository {
  private get db() {
    return getDb();
  }

  async findByDate(userId: string, localDate: string): Promise<ActivityEntryRow | undefined> {
    const [row] = await this.db
      .select()
      .from(activityEntries)
      .where(
        and(
          eq(activityEntries.userId, userId),
          eq(activityEntries.localDate, localDate),
          isNull(activityEntries.deletedAt),
        ),
      )
      .limit(1);
    return row;
  }

  /** Idempotent per-day write against UNIQUE (user_id, local_date). */
  async upsert(
    userId: string,
    localDate: string,
    data: UpsertActivityData,
  ): Promise<ActivityEntryRow> {
    const [row] = await this.db
      .insert(activityEntries)
      .values({
        userId,
        localDate,
        steps: data.steps ?? 0,
        activeMinutes: data.activeMinutes ?? 0,
        notes: data.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [activityEntries.userId, activityEntries.localDate],
        targetWhere: isNull(activityEntries.deletedAt),
        set: {
          ...(data.steps !== undefined && { steps: data.steps }),
          ...(data.activeMinutes !== undefined && { activeMinutes: data.activeMinutes }),
          ...(data.notes !== undefined && { notes: data.notes }),
          updatedAt: sql`now()`,
        },
      })
      .returning();
    if (!row) throw new Error('activity upsert returned no row');
    return row;
  }

  async listRange(userId: string, from: string, to: string): Promise<ActivityEntryRow[]> {
    return this.db
      .select()
      .from(activityEntries)
      .where(
        and(
          eq(activityEntries.userId, userId),
          between(activityEntries.localDate, from, to),
          isNull(activityEntries.deletedAt),
        ),
      )
      .orderBy(asc(activityEntries.localDate));
  }
}
