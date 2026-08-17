import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { users } from '../../database/schema/users.js';
import type { UserRow } from './users.types.js';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  locale?: string;
  timezone?: string;
}

export interface UpdateProfileData {
  name?: string | undefined;
  locale?: string | undefined;
  timezone?: string | undefined;
}

export class UsersRepository {
  // Lazy: never touches the database until a query runs.
  private get db() {
    return getDb();
  }

  async create(data: CreateUserData): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(data).returning();
    if (!row) throw new Error('users insert returned no row');
    return row;
  }

  /** Only non-deleted users. */
  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return row;
  }

  /** Includes soft-deleted users; callers decide (auth middleware rejects them). */
  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }

  async updateProfile(id: string, data: UpdateProfileData): Promise<UserRow | undefined> {
    const [row] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return row;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        deletedAt: new Date(),
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  /** Permanent deletion: FK cascades remove every owned row. */
  async hardDelete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
