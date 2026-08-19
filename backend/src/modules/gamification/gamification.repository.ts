import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { badges, userBadges, userStreaks } from '../../database/schema/gamification.js';

export type UserBadgeRow = typeof userBadges.$inferSelect;

export class GamificationRepository {
  private get db() {
    return getDb();
  }

  async listBadgeKeys(): Promise<string[]> {
    const rows = await this.db.select({ key: badges.key }).from(badges).orderBy(badges.key);
    return rows.map((row) => row.key);
  }

  async listUserBadges(userId: string): Promise<UserBadgeRow[]> {
    return this.db.select().from(userBadges).where(eq(userBadges.userId, userId));
  }

  /** Idempotent: the unique (user, badge) constraint absorbs repeats. */
  /** Awards all keys in one atomic statement — concurrent evaluations can't
   *  interleave partial awards. Already-earned badges are left untouched. */
  async awardMany(userId: string, badgeKeys: string[]): Promise<void> {
    if (badgeKeys.length === 0) return;
    const awardedAt = new Date();
    await this.db
      .insert(userBadges)
      .values(badgeKeys.map((badgeKey) => ({ userId, badgeKey, awardedAt })))
      .onConflictDoNothing();
  }

  /** Upserts the streak row, never letting the stored longest decrease. */
  async saveStreak(userId: string, kind: string, current: number, lastDate: string): Promise<void> {
    await this.db
      .insert(userStreaks)
      .values({ userId, kind, currentCount: current, longestCount: current, lastDate })
      .onConflictDoUpdate({
        target: [userStreaks.userId, userStreaks.kind],
        set: {
          currentCount: current,
          longestCount: sql`greatest(${userStreaks.longestCount}, ${current})`,
          lastDate,
          updatedAt: new Date(),
        },
      });
  }

  async getStreak(
    userId: string,
    kind: string,
  ): Promise<{ currentCount: number; longestCount: number } | undefined> {
    const [row] = await this.db
      .select()
      .from(userStreaks)
      .where(and(eq(userStreaks.userId, userId), eq(userStreaks.kind, kind)))
      .limit(1);
    return row;
  }
}
