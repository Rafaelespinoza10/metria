import type { AiFood, MealItemInput } from './types';

/** Maps AI-estimated foods into editable meal items (drops AI-only fields). */
export function aiFoodsToItems(foods: AiFood[]): MealItemInput[] {
  return foods.map((food) => ({
    name: food.name,
    ...(food.estimatedGrams !== undefined ? { grams: food.estimatedGrams } : {}),
    calories: food.calories,
    protein: food.protein,
    carbohydrates: food.carbohydrates,
    fat: food.fat,
  }));
}

/** Per-index confidence map for the items editor. */
export function foodConfidences(foods: AiFood[]): Record<number, number> {
  return Object.fromEntries(foods.map((food, index) => [index, food.confidence]));
}
