import { api } from '../../services/api';
import type { BodyRegion } from './regions';
import type { CatalogExercise, CatalogExerciseDetail, ExerciseLevel } from './types';

export function fetchExercises(
  region: BodyRegion,
  filter: { search?: string; level?: ExerciseLevel },
): Promise<{ exercises: CatalogExercise[] }> {
  const params = new URLSearchParams({ region, limit: '30' });
  if (filter.search) params.set('search', filter.search);
  if (filter.level) params.set('level', filter.level);
  return api<{ exercises: CatalogExercise[] }>(`/api/exercises?${params.toString()}`);
}

export function fetchExerciseDetail(id: string): Promise<{ exercise: CatalogExerciseDetail }> {
  return api<{ exercise: CatalogExerciseDetail }>(`/api/exercises/${id}`);
}
