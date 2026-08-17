import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGoal, fetchGoals } from './api';
import type { GoalStatus } from './types';

export function useGoals(status?: GoalStatus) {
  return useQuery({
    queryKey: ['goals', status ?? 'all'],
    queryFn: () => fetchGoals(status),
    select: (data) => data.goals,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}
