import { z } from 'zod';

/**
 * Metria's own backup format. Entries carry no ids and no user reference: importing
 * always writes into the authenticated account, so a document can never touch
 * another user's data. Bounds mirror the live write schemas.
 */

const instant = z.string().datetime({ offset: true });
const localDate = z.string().date();

export const EXPORT_VERSION = 1;

export const exportGoalSchema = z.object({
  category: z.enum(['lose_fat', 'gain_muscle', 'maintain', 'improve_habits']),
  metric: z.enum([
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
  ]),
  measurementTypeKey: z.string().max(50).nullable().optional(),
  startValue: z.number().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  targetDate: localDate.nullable().optional(),
  status: z.enum(['active', 'achieved', 'abandoned']),
});

export const exportDailyTargetSchema = z.object({
  metric: exportGoalSchema.shape.metric,
  value: z.number().min(0).max(100000),
  effectiveFrom: localDate,
});

export const exportMeasurementSchema = z.object({
  typeKey: z.string().max(50),
  value: z.number().min(0).max(9999),
  measuredAt: instant,
  notes: z.string().max(500).nullable().optional(),
});

export const exportMealSchema = z.object({
  category: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  name: z.string().min(1).max(120),
  eatenAt: instant,
  notes: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        grams: z.number().min(0).max(10000).nullable().optional(),
        calories: z.number().min(0).max(10000),
        protein: z.number().min(0).max(2000),
        carbohydrates: z.number().min(0).max(2000),
        fat: z.number().min(0).max(2000),
      }),
    )
    .max(50)
    .default([]),
});

export const exportActivitySchema = z.object({
  localDate,
  steps: z.number().int().min(0).max(200000).default(0),
  activeMinutes: z.number().int().min(0).max(1440).default(0),
  notes: z.string().max(500).nullable().optional(),
});

export const exportSleepSchema = z.object({
  bedtime: instant,
  wakeTime: instant,
  quality: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const exportWorkoutSchema = z.object({
  name: z.string().min(1).max(120),
  performedAt: instant,
  durationMinutes: z.number().int().min(1).max(600).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        muscleGroup: z.string().max(60).nullable().optional(),
        sets: z
          .array(
            z.object({
              repetitions: z.number().int().min(1).max(1000),
              weightKg: z.number().min(0).max(1000).nullable().optional(),
              rpe: z.number().min(1).max(10).nullable().optional(),
              notes: z.string().max(200).nullable().optional(),
            }),
          )
          .max(50)
          .default([]),
      }),
    )
    .max(30)
    .default([]),
});

/** Unknown fields (including `profile` and `measurementTypes`) are ignored on import. */
export const importDocumentSchema = z.object({
  version: z.literal(EXPORT_VERSION),
  goals: z.array(exportGoalSchema).max(500).default([]),
  dailyTargets: z.array(exportDailyTargetSchema).max(2000).default([]),
  measurements: z.array(exportMeasurementSchema).max(20000).default([]),
  meals: z.array(exportMealSchema).max(20000).default([]),
  activity: z.array(exportActivitySchema).max(5000).default([]),
  sleep: z.array(exportSleepSchema).max(5000).default([]),
  workouts: z.array(exportWorkoutSchema).max(5000).default([]),
});

export type ImportDocument = z.infer<typeof importDocumentSchema>;
