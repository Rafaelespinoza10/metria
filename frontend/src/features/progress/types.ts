export interface MetricVsTarget {
  value: number;
  target: number | null;
}

export interface ProgressScore {
  date: string;
  score: number;
  previousScore: number;
  delta: number;
  components: {
    nutrition: number | null;
    activity: number | null;
    sleep: number | null;
    consistency: number | null;
  };
}

export interface TodayPanel {
  date: string;
  calories: MetricVsTarget;
  protein: MetricVsTarget;
  steps: MetricVsTarget;
  activeMinutes: MetricVsTarget;
  sleepMinutes: MetricVsTarget;
  workouts: number;
}

export type BodyWindow = 'week' | '7d' | '30d' | '90d';

export interface BodyMetricDelta {
  key: string;
  unit: string;
  start: number | null;
  end: number | null;
  delta: number | null;
}

export interface BodyProgress {
  window: BodyWindow;
  metrics: BodyMetricDelta[];
  workouts: { current: number; previous: number };
}
