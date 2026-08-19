import { api } from '../../services/api';
import type {
  AlternativeSuggestion,
  CreateMealInput,
  DaySummary,
  Meal,
  MealAnalysis,
  NutritionTargets,
} from './types';

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

export function analyzeMealPhoto(photo: {
  uri: string;
  mimeType: string;
  fileName: string;
}): Promise<{ analysis: MealAnalysis }> {
  const formData = new FormData();
  formData.append('photo', {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob);
  return api<{ analysis: MealAnalysis }>('/api/nutrition/analyses', {
    method: 'POST',
    body: formData,
  });
}

export function updateMeal(id: string, input: Partial<CreateMealInput>): Promise<{ meal: Meal }> {
  return api<{ meal: Meal }>(`/api/nutrition/meals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteMeal(id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/api/nutrition/meals/${id}`, { method: 'DELETE' });
}

export function discardAnalysis(id: string): Promise<{ analysis: MealAnalysis }> {
  return api<{ analysis: MealAnalysis }>(`/api/nutrition/analyses/${id}/discard`, {
    method: 'POST',
  });
}

export function fetchAnalysis(id: string): Promise<{ analysis: MealAnalysis }> {
  return api<{ analysis: MealAnalysis }>(`/api/nutrition/analyses/${id}`);
}

export function confirmAnalysis(id: string, input: CreateMealInput): Promise<{ meal: Meal }> {
  return api<{ meal: Meal }>(`/api/nutrition/analyses/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchAlternatives(
  mealId: string,
): Promise<{ suggestions: AlternativeSuggestion[] }> {
  return api<{ suggestions: AlternativeSuggestion[] }>(
    `/api/nutrition/meals/${mealId}/alternatives`,
    { method: 'POST' },
  );
}
