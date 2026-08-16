import { date, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/** Seeded badge definitions. Names/descriptions are client i18n keys, keyed by `key`. */
export const badges = pgTable('badges', {
  key: text('key').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeKey: text('badge_key')
      .notNull()
      .references(() => badges.key),
    awardedAt: timestamp('awarded_at', { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex('user_badges_user_badge_unique').on(table.userId, table.badgeKey)],
);

export const userStreaks = pgTable(
  'user_streaks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'tracking', 'sleep_goal', …
    currentCount: integer('current_count').notNull().default(0),
    longestCount: integer('longest_count').notNull().default(0),
    lastDate: date('last_date'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_streaks_user_kind_unique').on(table.userId, table.kind)],
);
