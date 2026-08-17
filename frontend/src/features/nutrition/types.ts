export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MacroTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
}

export interface MealItemInput {
  name: string;
  grams?: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface MealItem extends MealItemInput {
  id: string;
  position: number;
}

export interface Meal {
  id: string;
  category: MealCategory;
  name: string;
  eatenAt: string;
  localDate: string;
  notes: string | null;
  items: MealItem[];
  totals: MacroTotals;
}

export interface CreateMealInput {
  category: MealCategory;
  name: string;
  eatenAt: string;
  notes?: string;
  items: MealItemInput[];
}

export interface NutritionTargets {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fats?: number;
}

export interface DaySummary {
  date: string;
  totals: MacroTotals;
  targets: NutritionTargets;
}
