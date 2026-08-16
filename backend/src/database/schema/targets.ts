import { date, numeric, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { metricEnum } from './enums.js';
import { softDeleteTimestamps } from './helpers.js';
import { users } from './users.js';

/**
 * Single source for daily adherence math (Progress Score, Today panel).
 * The target in effect for a day is the row with the latest effective_from <= that day.
 */
export const dailyTargets = pgTable(
  'daily_targets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // calories | protein | carbohydrates | fats | steps | active_minutes | sleep_minutes
    metric: metricEnum('metric').notNull(),
    value: numeric('value', { precision: 8, scale: 2, mode: 'number' }).notNull(),
    effectiveFrom: date('effective_from').notNull(),
    ...softDeleteTimestamps,
  },
  (table) => [
    uniqueIndex('daily_targets_user_metric_from_unique').on(
      table.userId,
      table.metric,
      table.effectiveFrom,
    ),
  ],
);
