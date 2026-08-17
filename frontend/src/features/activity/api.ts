import { api } from '../../services/api';
import type { ActivityEntry, ActivityTargets, PutActivityInput } from './types';

export function fetchActivityEntry(date: string): Promise<{ entry: ActivityEntry }> {
  return api<{ entry: ActivityEntry }>(`/api/activity/entries/${date}`);
}

export function putActivityEntry(
  date: string,
  input: PutActivityInput,
): Promise<{ entry: ActivityEntry }> {
  return api<{ entry: ActivityEntry }>(`/api/activity/entries/${date}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function fetchActivityTargets(): Promise<{ targets: ActivityTargets }> {
  return api<{ targets: ActivityTargets }>('/api/activity/targets');
}

export function putActivityTargets(input: {
  steps?: number;
  activeMinutes?: number;
}): Promise<{ targets: ActivityTargets }> {
  return api<{ targets: ActivityTargets }>('/api/activity/targets', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
