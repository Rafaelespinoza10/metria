import type { MacroTotals, Meal, MealItemInput } from './types';

// Date helpers now live in a shared module; re-exported to keep feature imports stable.
export { addDays, todayISO } from '../../services/dates';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Strips server-side fields from a meal's items so the edit form can resubmit them. */
export function mealToItemsInput(meal: Pick<Meal, 'items'>): MealItemInput[] {
  return meal.items.map((item) => ({
    name: item.name,
    ...(item.grams !== undefined && item.grams !== null ? { grams: item.grams } : {}),
    calories: item.calories,
    protein: item.protein,
    carbohydrates: item.carbohydrates,
    fat: item.fat,
  }));
}

/** Mirrors the backend totals math for live form previews. */
export function sumMealItems(items: MealItemInput[]): MacroTotals {
  return {
    calories: round1(items.reduce((sum, item) => sum + item.calories, 0)),
    protein: round1(items.reduce((sum, item) => sum + item.protein, 0)),
    carbohydrates: round1(items.reduce((sum, item) => sum + item.carbohydrates, 0)),
    fats: round1(items.reduce((sum, item) => sum + item.fat, 0)),
  };
}
