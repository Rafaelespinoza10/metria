import { sql } from 'drizzle-orm';
import { date, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { softDeleteTimestamps } from './helpers.js';
import { users } from './users.js';

export const activityEntries = pgTable(
  'activity_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    localDate: date('local_date').notNull(),
    steps: integer('steps').notNull().default(0),
    activeMinutes: integer('active_minutes').notNull().default(0),
    notes: text('notes'),
    // 'manual' for MVP; keeps room for 'apple_health', 'health_connect', … later.
    source: text('source').notNull().default('manual'),
    ...softDeleteTimestamps,
  },
  (table) => [
    uniqueIndex('activity_entries_user_date_unique')
      .on(table.userId, table.localDate)
      .where(sql`${table.deletedAt} is null`),
  ],
);
