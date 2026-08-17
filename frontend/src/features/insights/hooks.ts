import { useQuery } from '@tanstack/react-query';
import { fetchDailyInsight, fetchWeeklyInsight } from './api';

export function useDailyInsight() {
  return useQuery({
    queryKey: ['insights', 'daily'],
    queryFn: fetchDailyInsight,
    select: (data) => data.insight,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeeklyInsight() {
  return useQuery({
    queryKey: ['insights', 'weekly'],
    queryFn: fetchWeeklyInsight,
    select: (data) => data.insight,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
