import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSleepEntry, fetchSleepEntries, fetchSleepTargets, putSleepTarget } from './api';

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
