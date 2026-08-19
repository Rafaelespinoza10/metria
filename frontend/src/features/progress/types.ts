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

export type TrendsDays = 7 | 14 | 30;

export interface TrendsMetrics {
  calories: number | null;
  protein: number | null;
  steps: number | null;
  sleepMinutes: number | null;
}

export interface TrendsPoint {
  date: string;
  calories: number;
  steps: number;
  sleepMinutes: number;
  tracked: boolean;
}

export interface Trends {
  days: TrendsDays;
  from: string;
  to: string;
  targets: TrendsMetrics;
  averages: TrendsMetrics;
  series: TrendsPoint[];
}

export interface ProgressReport {
  generatedAt: string;
  period: { from: string; to: string };
  user: { name: string; email: string; memberSince: string };
  score: { score: number; previousScore: number; delta: number };
  averages: TrendsMetrics;
  targets: TrendsMetrics;
  body: BodyProgress;
  tracking: {
    trackedDays: number;
    totalDays: number;
    streak: { current: number; longest: number };
  };
  badges: { earned: number; total: number };
}
