import type { users } from '../../database/schema/users.js';

export type UserRow = typeof users.$inferSelect;

/** Shape exposed through the API and attached to req.user. Never includes the hash. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  locale: string;
  timezone: string;
  birthDate: string | null;
  heightCm: number | null;
  createdAt: Date;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    locale: row.locale,
    timezone: row.timezone,
    birthDate: row.birthDate,
    heightCm: row.heightCm,
    createdAt: row.createdAt,
  };
}
