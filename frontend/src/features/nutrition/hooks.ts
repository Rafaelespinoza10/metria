import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  analyzeMealPhoto,
  confirmAnalysis,
  createMeal,
  fetchAlternatives,
  fetchAnalysis,
  fetchMeals,
  fetchSummary,
  fetchTargets,
  putTargets,
} from './api';
import type { CreateMealInput } from './types';

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

export function useAnalyzeMealPhoto() {
  return useMutation({ mutationFn: analyzeMealPhoto });
}

export function useAnalysis(id: string) {
  return useQuery({
    queryKey: ['nutrition', 'analysis', id],
    queryFn: () => fetchAnalysis(id),
    select: (data) => data.analysis,
  });
}

export function useConfirmAnalysis(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMealInput) => confirmAnalysis(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutrition'] }),
  });
}

export function useAlternatives() {
  return useMutation({ mutationFn: fetchAlternatives });
}
