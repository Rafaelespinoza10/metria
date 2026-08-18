import { api } from '../../services/api';
import type {
  BodyProgress,
  BodyWindow,
  ProgressReport,
  ProgressScore,
  TodayPanel,
  Trends,
  TrendsDays,
} from './types';

export function fetchScore(): Promise<ProgressScore> {
  return api<ProgressScore>('/api/progress/score');
}

export function fetchToday(): Promise<TodayPanel> {
  return api<TodayPanel>('/api/progress/today');
}

export function fetchBody(window: BodyWindow): Promise<BodyProgress> {
  return api<BodyProgress>(`/api/progress/body?window=${window}`);
}

export function fetchTrends(days: TrendsDays): Promise<Trends> {
  return api<Trends>(`/api/progress/trends?days=${days}`);
}

export function fetchReport(): Promise<ProgressReport> {
  return api<ProgressReport>('/api/progress/report');
}
