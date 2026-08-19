import { useQuery } from '@tanstack/react-query';
import { fetchExerciseDetail, fetchExercises } from './api';
import type { BodyRegion } from './regions';
import type { ExerciseLevel } from './types';

export function useExercises(region: BodyRegion, search: string, level?: ExerciseLevel) {
  return useQuery({
    queryKey: ['exercises', region, search, level ?? 'all'],
    queryFn: () => fetchExercises(region, { search, ...(level ? { level } : {}) }),
    select: (data) => data.exercises,
    staleTime: Infinity, // vendored catalog: static per app version
  });
}

export function useExerciseDetail(id: string | null) {
  return useQuery({
    queryKey: ['exercises', 'detail', id],
    queryFn: () => fetchExerciseDetail(id ?? ''),
    select: (data) => data.exercise,
    enabled: id !== null,
    staleTime: Infinity,
  });
}
