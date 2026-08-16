import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { softDeleteTimestamps } from './helpers.js';
import { users } from './users.js';

export const measurementTypes = pgTable(
  'measurement_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    unit: text('unit').notNull(), // 'kg' | 'cm' | '%'
    // NULL = system type; set = user-defined custom type (future feature).
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('measurement_types_system_key_unique')
      .on(table.key)
      .where(sql`${table.userId} is null`),
    uniqueIndex('measurement_types_user_key_unique').on(table.userId, table.key),
  ],
);

export const measurements = pgTable(
  'measurements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    typeId: uuid('type_id')
      .notNull()
      .references(() => measurementTypes.id),
    value: numeric('value', { precision: 6, scale: 2, mode: 'number' }).notNull(),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    notes: text('notes'),
    ...softDeleteTimestamps,
  },
  (table) => [
    index('measurements_user_type_measured_idx').on(table.userId, table.typeId, table.measuredAt),
  ],
);

export const progressPhotos = pgTable('progress_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Storage-abstraction key (local disk now, S3/R2 later), never a raw filesystem path.
  fileKey: text('file_key').notNull(),
  takenAt: timestamp('taken_at', { withTimezone: true }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
