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

export interface AiFood {
  name: string;
  estimatedGrams?: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  micronutrients?: Record<string, number>;
  confidence: number;
}

export interface MealEstimation {
  foods: AiFood[];
  overallConfidence?: number;
  notes?: string;
}

export interface MealAnalysis {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'confirmed' | 'discarded';
  result: MealEstimation | null;
  errorCode: string | null;
}

export interface AlternativeSuggestion {
  title: string;
  description: string;
}
