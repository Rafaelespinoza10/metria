import { sql } from 'drizzle-orm';
import {
  check,
  date,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { softDeleteTimestamps } from './helpers.js';
import { users } from './users.js';

export const sleepEntries = pgTable(
  'sleep_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bedtime: timestamp('bedtime', { withTimezone: true }).notNull(),
    wakeTime: timestamp('wake_time', { withTimezone: true }).notNull(),
    // Computed at write time in the service (wake_time - bedtime).
    durationMinutes: integer('duration_minutes').notNull(),
    // The wake-up day in the user's timezone.
    localDate: date('local_date').notNull(),
    quality: smallint('quality'),
    notes: text('notes'),
    ...softDeleteTimestamps,
  },
  (table) => [
    uniqueIndex('sleep_entries_user_date_unique')
      .on(table.userId, table.localDate)
      .where(sql`${table.deletedAt} is null`),
    check('sleep_entries_quality_range', sql`${table.quality} between 1 and 5`),
  ],
);
