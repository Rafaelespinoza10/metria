import { and, eq } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { mealAnalyses } from '../../database/schema/nutrition.js';

export type MealAnalysisRow = typeof mealAnalyses.$inferSelect;
export type AnalysisStatus = MealAnalysisRow['status'];

export class MealAnalysisRepository {
  private get db() {
    return getDb();
  }

  async create(userId: string, imageKey: string): Promise<MealAnalysisRow> {
    const [row] = await this.db.insert(mealAnalyses).values({ userId, imageKey }).returning();
    if (!row) throw new Error('meal_analyses insert returned no row');
    return row;
  }

  async findByIdForUser(id: string, userId: string): Promise<MealAnalysisRow | undefined> {
    const [row] = await this.db
      .select()
      .from(mealAnalyses)
      .where(and(eq(mealAnalyses.id, id), eq(mealAnalyses.userId, userId)))
      .limit(1);
    return row;
  }

  async setResult(
    id: string,
    data:
      | { status: 'completed'; model: string; result: unknown }
      | { status: 'failed'; errorCode: string },
  ): Promise<MealAnalysisRow | undefined> {
    const [row] = await this.db
      .update(mealAnalyses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mealAnalyses.id, id))
      .returning();
    return row;
  }

  async setStatus(id: string, status: AnalysisStatus): Promise<void> {
    await this.db
      .update(mealAnalyses)
      .set({ status, updatedAt: new Date() })
      .where(eq(mealAnalyses.id, id));
  }
}
