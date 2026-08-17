import { z } from 'zod';

export const goalCategorySchema = z.enum(['lose_fat', 'gain_muscle', 'maintain', 'improve_habits']);

export const goalMetricSchema = z.enum([
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

export const goalStatusSchema = z.enum(['active', 'achieved', 'abandoned']);

const goalValueSchema = z.number().positive().max(999999.99);

export const createGoalSchema = z
  .object({
    category: goalCategorySchema,
    metric: goalMetricSchema,
    measurementTypeId: z.string().uuid().optional(),
    startValue: goalValueSchema.optional(),
    targetValue: goalValueSchema.optional(),
    targetDate: z.string().date().optional(),
  })
  .refine((data) => data.metric !== 'measurement' || data.measurementTypeId !== undefined, {
    message: 'measurementTypeId is required when metric is "measurement"',
    path: ['measurementTypeId'],
  })
  .refine((data) => data.metric === 'measurement' || data.measurementTypeId === undefined, {
    message: 'measurementTypeId is only allowed when metric is "measurement"',
    path: ['measurementTypeId'],
  });

export const updateGoalSchema = z
  .object({
    startValue: goalValueSchema.nullable().optional(),
    targetValue: goalValueSchema.nullable().optional(),
    targetDate: z.string().date().nullable().optional(),
    status: goalStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const listGoalsQuerySchema = z.object({
  status: goalStatusSchema.optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
