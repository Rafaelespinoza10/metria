import { api } from '../../services/api';
import type { CreateSleepInput, SleepEntry, SleepTargets, UpdateSleepInput } from './types';

export function fetchSleepEntries(): Promise<{ entries: SleepEntry[] }> {
  return api<{ entries: SleepEntry[] }>('/api/sleep');
}

export function createSleepEntry(input: CreateSleepInput): Promise<{ entry: SleepEntry }> {
  return api<{ entry: SleepEntry }>('/api/sleep', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchSleepTargets(): Promise<{ targets: SleepTargets }> {
  return api<{ targets: SleepTargets }>('/api/sleep/targets');
}

export function putSleepTarget(sleepMinutes: number): Promise<{ targets: SleepTargets }> {
  return api<{ targets: SleepTargets }>('/api/sleep/targets', {
    method: 'PUT',
    body: JSON.stringify({ sleepMinutes }),
  });
}

export function updateSleepEntry(
  id: string,
  input: UpdateSleepInput,
): Promise<{ entry: SleepEntry }> {
  return api<{ entry: SleepEntry }>(`/api/sleep/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteSleepEntry(id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/api/sleep/${id}`, { method: 'DELETE' });
}
