import { z } from 'zod';

const FUTURE_SKEW_MS = 5 * 60 * 1000;

const performedAtSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => new Date(value).getTime() <= Date.now() + FUTURE_SKEW_MS, {
    message: 'performedAt cannot be in the future',
  });

export const workoutSetSchema = z.object({
  repetitions: z.number().int().min(1).max(500),
  weightKg: z.number().min(0).max(1000).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(200).optional(),
});

export const workoutExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  muscleGroup: z.string().max(60).optional(),
  imageKey: z.string().min(1).max(255).optional(),
  sets: z.array(workoutSetSchema).min(1).max(30),
});

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(120),
  performedAt: performedAtSchema,
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  notes: z.string().max(500).optional(),
  exercises: z.array(workoutExerciseSchema).min(1).max(30),
});

export const updateWorkoutSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    performedAt: performedAtSchema.optional(),
    durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    exercises: z.array(workoutExerciseSchema).min(1).max(30).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const workoutsListQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  /** Matches the workout name OR any exercise name. */
  search: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type WorkoutsListQuery = z.infer<typeof workoutsListQuerySchema>;

export type WorkoutSetInput = z.infer<typeof workoutSetSchema>;
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
