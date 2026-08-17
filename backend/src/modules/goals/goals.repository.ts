import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { goals } from '../../database/schema/goals.js';

export type GoalRow = typeof goals.$inferSelect;
type GoalStatus = GoalRow['status'];

export interface CreateGoalData {
  userId: string;
  category: GoalRow['category'];
  metric: GoalRow['metric'];
  measurementTypeId?: string | undefined;
  startValue?: number | undefined;
  targetValue?: number | undefined;
  targetDate?: string | undefined;
}

export interface UpdateGoalData {
  startValue?: number | null | undefined;
  targetValue?: number | null | undefined;
  targetDate?: string | null | undefined;
  status?: GoalStatus | undefined;
}

export class GoalsRepository {
  private get db() {
    return getDb();
  }

  async create(data: CreateGoalData): Promise<GoalRow> {
    const [row] = await this.db.insert(goals).values(data).returning();
    if (!row) throw new Error('goals insert returned no row');
    return row;
  }

  async listByUser(userId: string, status?: GoalStatus): Promise<GoalRow[]> {
    const conditions = [eq(goals.userId, userId), isNull(goals.deletedAt)];
    if (status) conditions.push(eq(goals.status, status));
    return this.db
      .select()
      .from(goals)
      .where(and(...conditions))
      .orderBy(desc(goals.createdAt));
  }

  async findByIdForUser(id: string, userId: string): Promise<GoalRow | undefined> {
    const [row] = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .limit(1);
    return row;
  }

  async update(id: string, userId: string, data: UpdateGoalData): Promise<GoalRow | undefined> {
    const [row] = await this.db
      .update(goals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(goals.id, id), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .returning();
    return row;
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .update(goals)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(goals.id, id), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .returning({ id: goals.id });
    return row !== undefined;
  }
}
