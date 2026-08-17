import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createWorkout, fetchWorkouts } from './api';

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: fetchWorkouts,
    select: (data) => data.workouts,
  });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workouts'] }),
  });
}
