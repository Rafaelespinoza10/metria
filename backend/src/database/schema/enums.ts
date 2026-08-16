import { pgEnum } from 'drizzle-orm/pg-core';

export const goalCategoryEnum = pgEnum('goal_category', [
  'lose_fat',
  'gain_muscle',
  'maintain',
  'improve_habits',
]);

export const goalStatusEnum = pgEnum('goal_status', ['active', 'achieved', 'abandoned']);

export const metricEnum = pgEnum('metric', [
  'weight',
  'body_fat',
  'calories',
  'protein',
  'carbohydrates',
  'fats',
  'steps',
  'active_minutes',
  'sleep_minutes',
  'workout_frequency',
  'measurement',
]);

export const mealCategoryEnum = pgEnum('meal_category', ['breakfast', 'lunch', 'dinner', 'snack']);

export const mealSourceEnum = pgEnum('meal_source', ['manual', 'ai_confirmed']);

export const analysisStatusEnum = pgEnum('analysis_status', [
  'pending',
  'completed',
  'failed',
  'confirmed',
  'discarded',
]);

export const insightPeriodEnum = pgEnum('insight_period', ['daily', 'weekly']);
