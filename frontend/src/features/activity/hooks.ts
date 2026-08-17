import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchActivityEntry,
  fetchActivityTargets,
  putActivityEntry,
  putActivityTargets,
} from './api';
import type { PutActivityInput } from './types';

export function useActivityEntry(date: string) {
  return useQuery({
    queryKey: ['activity', 'entry', date],
    queryFn: () => fetchActivityEntry(date),
    select: (data) => data.entry,
  });
}

export function usePutActivityEntry(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PutActivityInput) => putActivityEntry(date, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity'] }),
  });
}

export function useActivityTargets() {
  return useQuery({
    queryKey: ['activity', 'targets'],
    queryFn: fetchActivityTargets,
    select: (data) => data.targets,
  });
}

export function usePutActivityTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putActivityTargets,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity'] }),
  });
}
