import { date, index, numeric, pgTable, uuid } from 'drizzle-orm/pg-core';
import { goalCategoryEnum, goalStatusEnum, metricEnum } from './enums.js';
import { softDeleteTimestamps } from './helpers.js';
import { measurementTypes } from './measurements.js';
import { users } from './users.js';

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: goalCategoryEnum('category').notNull(),
    metric: metricEnum('metric').notNull(),
    // Only set when metric = 'measurement' (targets one body site).
    measurementTypeId: uuid('measurement_type_id').references(() => measurementTypes.id),
    startValue: numeric('start_value', { precision: 8, scale: 2, mode: 'number' }),
    // NULL allowed for habit-style goals without a numeric target.
    targetValue: numeric('target_value', { precision: 8, scale: 2, mode: 'number' }),
    targetDate: date('target_date'),
    status: goalStatusEnum('status').notNull().default('active'),
    ...softDeleteTimestamps,
    // Current progress is computed by the progress service, never stored.
  },
  (table) => [index('goals_user_status_idx').on(table.userId, table.status)],
);
