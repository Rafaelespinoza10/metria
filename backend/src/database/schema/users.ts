import { sql } from 'drizzle-orm';
import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { softDeleteTimestamps } from './helpers.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    locale: text('locale').notNull().default('en'),
    // IANA timezone name; used to compute local_date on daily-keyed tables.
    timezone: text('timezone').notNull().default('UTC'),
    // Bumped on logout / password reset / soft delete to revoke all issued JWTs.
    tokenVersion: integer('token_version').notNull().default(0),
    // Optional body data for age/BMI display in the app (never medical judgment).
    birthDate: date('birth_date'),
    heightCm: numeric('height_cm', { precision: 5, scale: 2, mode: 'number' }),
    ...softDeleteTimestamps,
  },
  (table) => [
    uniqueIndex('users_email_unique')
      .on(table.email)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
