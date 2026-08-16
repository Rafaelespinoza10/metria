import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { analysisStatusEnum, mealCategoryEnum, mealSourceEnum } from './enums.js';
import { softDeleteTimestamps } from './helpers.js';
import { users } from './users.js';

/** AI drafts. NEVER a nutrition record by themselves — confirming copies user-approved
 *  values into meals/meal_items and marks the analysis 'confirmed'. */
export const mealAnalyses = pgTable('meal_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  imageKey: text('image_key').notNull(),
  status: analysisStatusEnum('status').notNull().default('pending'),
  model: text('model'),
  // Zod-validated structured estimation (foods, portions, macros, confidence).
  result: jsonb('result'),
  errorCode: text('error_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const meals = pgTable(
  'meals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: mealCategoryEnum('category').notNull(),
    name: text('name').notNull(),
    eatenAt: timestamp('eaten_at', { withTimezone: true }).notNull(),
    // User-local calendar day, computed at write time from the user's timezone.
    localDate: date('local_date').notNull(),
    source: mealSourceEnum('source').notNull().default('manual'),
    analysisId: uuid('analysis_id').references(() => mealAnalyses.id, { onDelete: 'set null' }),
    notes: text('notes'),
    ...softDeleteTimestamps,
  },
  (table) => [index('meals_user_local_date_idx').on(table.userId, table.localDate)],
);

export const mealItems = pgTable('meal_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  mealId: uuid('meal_id')
    .notNull()
    .references(() => meals.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  grams: numeric('grams', { precision: 7, scale: 2, mode: 'number' }),
  calories: numeric('calories', { precision: 7, scale: 2, mode: 'number' }).notNull(),
  protein: numeric('protein', { precision: 6, scale: 2, mode: 'number' }).notNull(),
  carbohydrates: numeric('carbohydrates', { precision: 6, scale: 2, mode: 'number' }).notNull(),
  fat: numeric('fat', { precision: 6, scale: 2, mode: 'number' }).notNull(),
  // e.g. { "fiber_g": 4.2, "sodium_mg": 300 } — only when data is available.
  micronutrients: jsonb('micronutrients'),
  position: integer('position').notNull(),
});
