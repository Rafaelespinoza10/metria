import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { softDeleteTimestamps } from './helpers.js';
import { users } from './users.js';

export const workouts = pgTable(
  'workouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
    localDate: date('local_date').notNull(),
    durationMinutes: integer('duration_minutes'),
    notes: text('notes'),
    ...softDeleteTimestamps,
  },
  (table) => [index('workouts_user_local_date_idx').on(table.userId, table.localDate)],
);

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workoutId: uuid('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    muscleGroup: text('muscle_group'),
    imageKey: text('image_key'),
    position: integer('position').notNull(),
  },
  (table) => [index('workout_exercises_workout_idx').on(table.workoutId)],
);

export const workoutSets = pgTable(
  'workout_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    repetitions: integer('repetitions').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
    rpe: numeric('rpe', { precision: 3, scale: 1, mode: 'number' }),
    notes: text('notes'),
  },
  (table) => [
    check('workout_sets_rpe_range', sql`${table.rpe} between 1 and 10`),
    index('workout_sets_exercise_idx').on(table.exerciseId),
  ],
);
