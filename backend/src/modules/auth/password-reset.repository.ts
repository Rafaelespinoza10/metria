import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { passwordResetTokens } from '../../database/schema/users.js';

export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;

export class PasswordResetRepository {
  private get db() {
    return getDb();
  }

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
  }

  /** Unused and unexpired only. */
  async findValidByHash(tokenHash: string): Promise<PasswordResetTokenRow | undefined> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return row;
  }

  async markUsed(id: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }
}
