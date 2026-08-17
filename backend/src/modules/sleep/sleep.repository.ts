import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { sleepEntries } from '../../database/schema/sleep.js';

export type SleepEntryRow = typeof sleepEntries.$inferSelect;

export interface CreateSleepData {
  userId: string;
  bedtime: Date;
  wakeTime: Date;
  durationMinutes: number;
  localDate: string;
  quality?: number | undefined;
  notes?: string | undefined;
}

export interface UpdateSleepData {
  bedtime?: Date | undefined;
  wakeTime?: Date | undefined;
  durationMinutes?: number | undefined;
  localDate?: string | undefined;
  quality?: number | null | undefined;
  notes?: string | null | undefined;
}

export class SleepRepository {
  private get db() {
    return getDb();
  }

  async findByDate(userId: string, localDate: string): Promise<SleepEntryRow | undefined> {
    const [row] = await this.db
      .select()
      .from(sleepEntries)
      .where(
        and(
          eq(sleepEntries.userId, userId),
          eq(sleepEntries.localDate, localDate),
          isNull(sleepEntries.deletedAt),
        ),
      )
      .limit(1);
    return row;
  }

  async create(data: CreateSleepData): Promise<SleepEntryRow> {
    const [row] = await this.db.insert(sleepEntries).values(data).returning();
    if (!row) throw new Error('sleep_entries insert returned no row');
    return row;
  }

  async listRange(userId: string, from?: string, to?: string): Promise<SleepEntryRow[]> {
    const rows = await this.db
      .select()
      .from(sleepEntries)
      .where(and(eq(sleepEntries.userId, userId), isNull(sleepEntries.deletedAt)))
      .orderBy(desc(sleepEntries.localDate))
      .limit(120);
    return rows.filter((row) => (!from || row.localDate >= from) && (!to || row.localDate <= to));
  }

  async update(
    id: string,
    userId: string,
    data: UpdateSleepData,
  ): Promise<SleepEntryRow | undefined> {
    const [row] = await this.db
      .update(sleepEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(sleepEntries.id, id),
          eq(sleepEntries.userId, userId),
          isNull(sleepEntries.deletedAt),
        ),
      )
      .returning();
    return row;
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .update(sleepEntries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(sleepEntries.id, id),
          eq(sleepEntries.userId, userId),
          isNull(sleepEntries.deletedAt),
        ),
      )
      .returning({ id: sleepEntries.id });
    return row !== undefined;
  }
}
