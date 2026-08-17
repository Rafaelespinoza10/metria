import { useQuery } from '@tanstack/react-query';
import { fetchBody, fetchScore, fetchToday } from './api';
import type { BodyWindow } from './types';

export function useProgressScore() {
  return useQuery({ queryKey: ['progress', 'score'], queryFn: fetchScore });
}

export function useTodayPanel() {
  return useQuery({ queryKey: ['progress', 'today'], queryFn: fetchToday });
}

export function useBodyProgress(window: BodyWindow) {
  return useQuery({
    queryKey: ['progress', 'body', window],
    queryFn: () => fetchBody(window),
  });
}
