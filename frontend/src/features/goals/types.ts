export type GoalCategory = 'lose_fat' | 'gain_muscle' | 'maintain' | 'improve_habits';

export type GoalMetric =
  | 'weight'
  | 'body_fat'
  | 'calories'
  | 'protein'
  | 'carbohydrates'
  | 'fats'
  | 'steps'
  | 'active_minutes'
  | 'sleep_minutes'
  | 'workout_frequency'
  | 'measurement';

export type GoalStatus = 'active' | 'achieved' | 'abandoned';

export interface Goal {
  id: string;
  category: GoalCategory;
  metric: GoalMetric;
  measurementTypeId: string | null;
  startValue: number | null;
  targetValue: number | null;
  targetDate: string | null;
  status: GoalStatus;
  createdAt: string;
}

export interface CreateGoalInput {
  category: GoalCategory;
  metric: GoalMetric;
  measurementTypeId?: string;
  startValue?: number;
  targetValue?: number;
}
