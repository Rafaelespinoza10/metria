import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMeal, fetchMeals, fetchSummary, fetchTargets, putTargets } from './api';

export function useMeals(date: string) {
  return useQuery({
    queryKey: ['nutrition', 'meals', date],
    queryFn: () => fetchMeals(date),
    select: (data) => data.meals,
  });
}

export function useDaySummary(date: string) {
  return useQuery({
    queryKey: ['nutrition', 'summary', date],
    queryFn: () => fetchSummary(date),
  });
}

export function useCreateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMeal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutrition'] }),
  });
}

export function useNutritionTargets() {
  return useQuery({
    queryKey: ['nutrition', 'targets'],
    queryFn: fetchTargets,
    select: (data) => data.targets,
  });
}

export function usePutTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putTargets,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutrition'] }),
  });
}
