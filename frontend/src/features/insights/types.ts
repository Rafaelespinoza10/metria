export interface MetricVsTarget {
  value: number;
  target: number | null;
}

export interface DailyAggregates {
  date: string;
  calories: MetricVsTarget;
  protein: MetricVsTarget;
  steps: MetricVsTarget;
  sleepMinutes: MetricVsTarget;
  workouts: number;
}

export interface WeekSummary {
  start: string;
  end: string;
  avgSteps: number | null;
  avgSleepMinutes: number | null;
  proteinGoalCompletion: number | null;
  workouts: number;
  weightStart: number | null;
  weightEnd: number | null;
}

export interface WeeklyAggregates {
  current: WeekSummary;
  previous: WeekSummary;
}

export interface Insight<TAggregates> {
  id: string;
  period: 'daily' | 'weekly';
  periodStart: string;
  content: string;
  aggregates: TAggregates;
}
