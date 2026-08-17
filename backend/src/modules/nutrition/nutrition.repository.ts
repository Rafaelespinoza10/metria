import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { mealItems, meals } from '../../database/schema/nutrition.js';
import type { MealItemInput } from './nutrition.schema.js';

export type MealRow = typeof meals.$inferSelect;
export type MealItemRow = typeof mealItems.$inferSelect;

export interface MealWithItems extends MealRow {
  items: MealItemRow[];
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
      return { ...row, items: insertedItems };
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
    const mealRows = await this.db
      .select()
      .from(meals)
      .where(and(eq(meals.userId, userId), isNull(meals.deletedAt)))
      .orderBy(desc(meals.eatenAt));
    // Range filtering in SQL when the progress workflows need it; per-day is the hot path.
    return this.attachItems(
      mealRows.filter((meal) => meal.localDate >= from && meal.localDate <= to),
    );
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
        return { ...row, items: inserted };
      }
      const existing = await tx
        .select()
        .from(mealItems)
        .where(eq(mealItems.mealId, row.id))
        .orderBy(asc(mealItems.position));
      return { ...row, items: existing };
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
    return mealRows.map((meal) => ({ ...meal, items: byMeal.get(meal.id) ?? [] }));
  }
}
