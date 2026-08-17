import { api } from '../../services/api';
import type { BodyProgress, BodyWindow, ProgressScore, TodayPanel } from './types';

export function fetchScore(): Promise<ProgressScore> {
  return api<ProgressScore>('/api/progress/score');
}

export function fetchToday(): Promise<TodayPanel> {
  return api<TodayPanel>('/api/progress/today');
}

export function fetchBody(window: BodyWindow): Promise<BodyProgress> {
  return api<BodyProgress>(`/api/progress/body?window=${window}`);
}
