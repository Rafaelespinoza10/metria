import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { GamificationState } from './types';

export function useGamification() {
  return useQuery({
    queryKey: ['gamification'],
    queryFn: () => api<GamificationState>('/api/gamification'),
  });
}
