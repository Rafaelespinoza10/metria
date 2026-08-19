import { and, asc, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { mealAnalyses, mealItems, meals } from '../../database/schema/nutrition.js';
import type { MealItemInput } from './nutrition.schema.js';

export type MealRow = typeof meals.$inferSelect;
export type MealItemRow = typeof mealItems.$inferSelect;

export interface MealWithItems extends MealRow {
  items: MealItemRow[];
  /** Storage key of the analyzed photo, for meals confirmed from an AI scan. */
  imageKey: string | null;
}

export interface CreateMealData {
  userId: string;
  category: MealRow['category'];
  name: string;
  eatenAt: Date;
  localDate: string;
  notes?: string | undefined;
  items: MealItemInput[];
  source?: MealRow['source'] | undefined;
  analysisId?: string | undefined;
}

export interface UpdateMealData {
  category?: MealRow['category'] | undefined;
  name?: string | undefined;
  eatenAt?: Date | undefined;
  localDate?: string | undefined;
  notes?: string | null | undefined;
  items?: MealItemInput[] | undefined;
}

function itemValues(mealId: string, items: MealItemInput[]) {
  return items.map((item, position) => ({
    mealId,
    name: item.name,
    grams: item.grams ?? null,
    calories: item.calories,
    protein: item.protein,
    carbohydrates: item.carbohydrates,
    fat: item.fat,
    micronutrients: item.micronutrients ?? null,
    position,
  }));
}

export class NutritionRepository {
  private get db() {
    return getDb();
  }

  async createMeal(data: CreateMealData): Promise<MealWithItems> {
    return this.db.transaction(async (tx) => {
      const { items, ...meal } = data;
      const [row] = await tx.insert(meals).values(meal).returning();
      if (!row) throw new Error('meals insert returned no row');
      const insertedItems = await tx
        .insert(mealItems)
        .values(itemValues(row.id, items))
        .returning();
      return { ...row, items: insertedItems, imageKey: null };
    });
  }

  async listByLocalDate(userId: string, localDate: string): Promise<MealWithItems[]> {
    const mealRows = await this.db
      .select()
      .from(meals)
      .where(and(eq(meals.userId, userId), eq(meals.localDate, localDate), isNull(meals.deletedAt)))
      .orderBy(asc(meals.eatenAt));
    return this.attachItems(mealRows);
  }

  async listByLocalDateRange(userId: string, from: string, to: string): Promise<MealWithItems[]> {
    // This backs progress score, trends, insights, and gamification — the range
    // must be a SQL predicate or every call scans the user's entire history.
    const mealRows = await this.db
      .select()
      .from(meals)
      .where(
        and(
          eq(meals.userId, userId),
          gte(meals.localDate, from),
          lte(meals.localDate, to),
          isNull(meals.deletedAt),
        ),
      )
      .orderBy(desc(meals.eatenAt));
    return this.attachItems(mealRows);
  }

  async findByIdForUser(id: string, userId: string): Promise<MealWithItems | undefined> {
    const [row] = await this.db
      .select()
      .from(meals)
      .where(and(eq(meals.id, id), eq(meals.userId, userId), isNull(meals.deletedAt)))
      .limit(1);
    if (!row) return undefined;
    const [withItems] = await this.attachItems([row]);
    return withItems;
  }

  async updateMeal(
    id: string,
    userId: string,
    data: UpdateMealData,
  ): Promise<MealWithItems | undefined> {
    return this.db.transaction(async (tx) => {
      const { items, ...fields } = data;
      const [row] = await tx
        .update(meals)
        .set({ ...fields, updatedAt: new Date() })
        .where(and(eq(meals.id, id), eq(meals.userId, userId), isNull(meals.deletedAt)))
        .returning();
      if (!row) return undefined;

      if (items) {
        await tx.delete(mealItems).where(eq(mealItems.mealId, row.id));
        const inserted = await tx.insert(mealItems).values(itemValues(row.id, items)).returning();
        return { ...row, items: inserted, imageKey: null };
      }
      const existing = await tx
        .select()
        .from(mealItems)
        .where(eq(mealItems.mealId, row.id))
        .orderBy(asc(mealItems.position));
      return { ...row, items: existing, imageKey: null };
    });
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .update(meals)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(meals.id, id), eq(meals.userId, userId), isNull(meals.deletedAt)))
      .returning({ id: meals.id });
    return row !== undefined;
  }

  private async attachItems(mealRows: MealRow[]): Promise<MealWithItems[]> {
    if (mealRows.length === 0) return [];
    const items = await this.db
      .select()
      .from(mealItems)
      .where(
        inArray(
          mealItems.mealId,
          mealRows.map((meal) => meal.id),
        ),
      )
      .orderBy(asc(mealItems.position));
    const byMeal = new Map<string, MealItemRow[]>();
    for (const item of items) {
      const list = byMeal.get(item.mealId) ?? [];
      list.push(item);
      byMeal.set(item.mealId, list);
    }

    const analysisIds = mealRows
      .map((meal) => meal.analysisId)
      .filter((id): id is string => id !== null);
    const imageByAnalysis = new Map<string, string>();
    if (analysisIds.length > 0) {
      const analyses = await this.db
        .select({ id: mealAnalyses.id, imageKey: mealAnalyses.imageKey })
        .from(mealAnalyses)
        .where(inArray(mealAnalyses.id, analysisIds));
      for (const analysis of analyses) {
        imageByAnalysis.set(analysis.id, analysis.imageKey);
      }
    }

    return mealRows.map((meal) => ({
      ...meal,
      items: byMeal.get(meal.id) ?? [],
      imageKey: meal.analysisId ? (imageByAnalysis.get(meal.analysisId) ?? null) : null,
    }));
  }
}
