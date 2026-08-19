import type { UpdateSleepInput } from './types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSleepEntry,
  deleteSleepEntry,
  fetchSleepEntries,
  fetchSleepTargets,
  putSleepTarget,
  updateSleepEntry,
} from './api';

export function useSleepEntries() {
  return useQuery({
    queryKey: ['sleep', 'entries'],
    queryFn: fetchSleepEntries,
    select: (data) => data.entries,
  });
}

export function useCreateSleep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSleepEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sleep'] }),
  });
}

export function useUpdateSleep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; changes: UpdateSleepInput }) =>
      updateSleepEntry(input.id, input.changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sleep'] }),
  });
}

export function useDeleteSleep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSleepEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sleep'] }),
  });
}

export function useSleepTargets() {
  return useQuery({
    queryKey: ['sleep', 'targets'],
    queryFn: fetchSleepTargets,
    select: (data) => data.targets,
  });
}

export function usePutSleepTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putSleepTarget,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sleep'] }),
  });
}
