import { api } from '../../services/api';
import type { CreateMealInput, DaySummary, Meal, NutritionTargets } from './types';

export function fetchMeals(date: string): Promise<{ meals: Meal[] }> {
  return api<{ meals: Meal[] }>(`/api/nutrition/meals?date=${date}`);
}

export function createMeal(input: CreateMealInput): Promise<{ meal: Meal }> {
  return api<{ meal: Meal }>('/api/nutrition/meals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchSummary(date: string): Promise<DaySummary> {
  return api<DaySummary>(`/api/nutrition/summary?date=${date}`);
}

export function fetchTargets(): Promise<{ targets: NutritionTargets }> {
  return api<{ targets: NutritionTargets }>('/api/nutrition/targets');
}

export function putTargets(input: NutritionTargets): Promise<{ targets: NutritionTargets }> {
  return api<{ targets: NutritionTargets }>('/api/nutrition/targets', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
