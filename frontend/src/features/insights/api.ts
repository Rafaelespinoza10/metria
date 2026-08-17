import { api } from '../../services/api';
import type { DailyAggregates, Insight, WeeklyAggregates } from './types';

export function fetchDailyInsight(): Promise<{ insight: Insight<DailyAggregates> }> {
  return api<{ insight: Insight<DailyAggregates> }>('/api/insights/daily');
}

export function fetchWeeklyInsight(): Promise<{ insight: Insight<WeeklyAggregates> }> {
  return api<{ insight: Insight<WeeklyAggregates> }>('/api/insights/weekly');
}
