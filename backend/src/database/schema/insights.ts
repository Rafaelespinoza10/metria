import { date, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { insightPeriodEnum } from './enums.js';
import { users } from './users.js';

export const insights = pgTable(
  'insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    period: insightPeriodEnum('period').notNull(),
    periodStart: date('period_start').notNull(),
    // The deterministic summary sent to the model. Code calculates; AI interprets.
    aggregates: jsonb('aggregates').notNull(),
    content: text('content').notNull(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('insights_user_period_start_unique').on(
      table.userId,
      table.period,
      table.periodStart,
    ),
  ],
);
