import type { GoalCategory, GoalMetric, GoalStatus } from './types';

export function goalCategoryKey(category: GoalCategory): string {
  return `goals.category.${category}`;
}

export function goalMetricKey(metric: GoalMetric): string {
  return `goals.metric.${metric}`;
}

export function goalStatusKey(status: GoalStatus): string {
  return `goals.status.${status}`;
}

/** Display unit per metric; measurement goals take their unit from the selected type. */
export function goalMetricUnit(metric: GoalMetric): string {
  switch (metric) {
    case 'weight':
      return 'kg';
    case 'body_fat':
      return '%';
    case 'calories':
      return 'kcal';
    case 'protein':
    case 'carbohydrates':
    case 'fats':
      return 'g';
    case 'active_minutes':
    case 'sleep_minutes':
      return 'min';
    case 'workout_frequency':
      return '/wk';
    case 'steps':
    case 'measurement':
      return '';
  }
}

/** Parses user numeric input, accepting both '.' and ',' decimal separators. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '' || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}
