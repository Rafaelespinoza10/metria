import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, todayISO } from '../../services/dates';
import {
  createWorkout,
  deleteWorkout,
  fetchWorkout,
  fetchWorkouts,
  type WorkoutsFilter,
} from './api';

export function useWorkoutsPages(filter: WorkoutsFilter) {
  return useInfiniteQuery({
    queryKey: ['workouts', 'list', filter.from ?? 'all', filter.search ?? ''],
    queryFn: ({ pageParam }) => fetchWorkouts(filter, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.offset + last.workouts.length < last.total ? last.offset + last.limit : undefined,
  });
}

/** Unfiltered last-7-days fetch feeding the weekly hero, independent of list filters. */
export function useWeeklyWorkouts() {
  return useQuery({
    queryKey: ['workouts', 'weekly'],
    queryFn: () => fetchWorkouts({ from: addDays(todayISO(), -6) }, 0),
    select: (data) => data.workouts,
  });
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workouts', 'detail', id],
    queryFn: () => fetchWorkout(id),
    select: (data) => data.workout,
  });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workouts'] }),
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workouts'] }),
  });
}
