import { AppError } from '../../shared/errors/app-error.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { DailyTargetsRepository } from './daily-targets.repository.js';
import type { CreateMealInput, PutTargetsInput, UpdateMealInput } from './nutrition.schema.js';
import type { MealWithItems, NutritionRepository } from './nutrition.repository.js';

export interface MacroTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
}

export interface MealResponse extends MealWithItems {
  totals: MacroTotals;
  /** Auth-gated URL of the analyzed photo, when confirmed from an AI scan. */
  imageUrl: string | null;
}

export interface NutritionTargets {
  calories?: number | undefined;
  protein?: number | undefined;
  carbohydrates?: number | undefined;
  fats?: number | undefined;
}

export interface DaySummary {
  date: string;
  totals: MacroTotals;
  targets: NutritionTargets;
}

const NUTRITION_METRICS = ['calories', 'protein', 'carbohydrates', 'fats'] as const;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function mealTotals(meal: MealWithItems): MacroTotals {
  return {
    calories: round1(meal.items.reduce((sum, item) => sum + item.calories, 0)),
    protein: round1(meal.items.reduce((sum, item) => sum + item.protein, 0)),
    carbohydrates: round1(meal.items.reduce((sum, item) => sum + item.carbohydrates, 0)),
    fats: round1(meal.items.reduce((sum, item) => sum + item.fat, 0)),
  };
}

function withTotals(meal: MealWithItems): MealResponse {
  return {
    ...meal,
    totals: mealTotals(meal),
    imageUrl: meal.imageKey ? `/api/uploads/${meal.imageKey}` : null,
  };
}

export class NutritionService {
  constructor(
    private readonly nutritionRepository: NutritionRepository,
    private readonly dailyTargetsRepository: DailyTargetsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  private async userTimezone(userId: string): Promise<string> {
    const user = await this.usersRepository.findById(userId);
    return user?.timezone ?? 'UTC';
  }

  private async resolveDate(userId: string, date?: string): Promise<string> {
    return date ?? localDateFor(new Date(), await this.userTimezone(userId));
  }

  async createMeal(userId: string, input: CreateMealInput): Promise<MealResponse> {
    const eatenAt = new Date(input.eatenAt);
    const meal = await this.nutritionRepository.createMeal({
      userId,
      category: input.category,
      name: input.name,
      eatenAt,
      localDate: localDateFor(eatenAt, await this.userTimezone(userId)),
      notes: input.notes,
      items: input.items,
    });
    return withTotals(meal);
  }

  async listMeals(userId: string, date?: string): Promise<MealResponse[]> {
    const localDate = await this.resolveDate(userId, date);
    const meals = await this.nutritionRepository.listByLocalDate(userId, localDate);
    return meals.map(withTotals);
  }

  async getMeal(userId: string, id: string): Promise<MealResponse> {
    const meal = await this.nutritionRepository.findByIdForUser(id, userId);
    if (!meal) throw AppError.notFound('Meal not found');
    return withTotals(meal);
  }

  async updateMeal(userId: string, id: string, input: UpdateMealInput): Promise<MealResponse> {
    const eatenAt = input.eatenAt ? new Date(input.eatenAt) : undefined;
    const meal = await this.nutritionRepository.updateMeal(id, userId, {
      category: input.category,
      name: input.name,
      eatenAt,
      localDate: eatenAt ? localDateFor(eatenAt, await this.userTimezone(userId)) : undefined,
      notes: input.notes,
      items: input.items,
    });
    if (!meal) throw AppError.notFound('Meal not found');
    return withTotals(meal);
  }

  async softDeleteMeal(userId: string, id: string): Promise<void> {
    const deleted = await this.nutritionRepository.softDelete(id, userId);
    if (!deleted) throw AppError.notFound('Meal not found');
  }

  async getTargets(userId: string, date?: string): Promise<NutritionTargets> {
    const localDate = await this.resolveDate(userId, date);
    return this.dailyTargetsRepository.effectiveFor(userId, [...NUTRITION_METRICS], localDate);
  }

  /** Upserts today's row per provided metric (date-effective history preserved). */
  async putTargets(userId: string, input: PutTargetsInput): Promise<NutritionTargets> {
    const today = localDateFor(new Date(), await this.userTimezone(userId));
    for (const metric of NUTRITION_METRICS) {
      const value = input[metric];
      if (value !== undefined) {
        await this.dailyTargetsRepository.upsert(userId, metric, value, today);
      }
    }
    return this.getTargets(userId, today);
  }

  async daySummary(userId: string, date?: string): Promise<DaySummary> {
    const localDate = await this.resolveDate(userId, date);
    const [meals, targets] = await Promise.all([
      this.listMeals(userId, localDate),
      this.getTargets(userId, localDate),
    ]);
    const totals = meals.reduce<MacroTotals>(
      (acc, meal) => ({
        calories: round1(acc.calories + meal.totals.calories),
        protein: round1(acc.protein + meal.totals.protein),
        carbohydrates: round1(acc.carbohydrates + meal.totals.carbohydrates),
        fats: round1(acc.fats + meal.totals.fats),
      }),
      { calories: 0, protein: 0, carbohydrates: 0, fats: 0 },
    );
    return { date: localDate, totals, targets };
  }
}
