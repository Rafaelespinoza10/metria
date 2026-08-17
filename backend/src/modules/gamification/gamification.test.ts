import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { addDaysISO } from '../../shared/utils/date-range.js';
import { DailyTargetsRepository } from '../nutrition/daily-targets.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import { currentStreak } from './streaks.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

const app = createApp();
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `gamification-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Gamification Test',
      timezone: 'UTC',
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

const TODAY = new Date().toISOString().slice(0, 10);

describe('currentStreak (pure)', () => {
  it('counts consecutive days ending today, or yesterday when today is empty', () => {
    const days = new Set([TODAY, addDaysISO(TODAY, -1), addDaysISO(TODAY, -2)]);
    expect(currentStreak(days, TODAY)).toBe(3);

    const fromYesterday = new Set([addDaysISO(TODAY, -1), addDaysISO(TODAY, -2)]);
    expect(currentStreak(fromYesterday, TODAY)).toBe(2);

    const withGap = new Set([TODAY, addDaysISO(TODAY, -2)]);
    expect(currentStreak(withGap, TODAY)).toBe(1);

    expect(currentStreak(new Set(), TODAY)).toBe(0);
  });
});

describe.skipIf(!hasDatabase)('gamification', () => {
  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('computes streaks, awards badges idempotently, and keeps the longest', async () => {
    const { token, id } = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };

    // 7 consecutive tracked days ending today (steps also sum past 100k).
    for (let i = 0; i < 7; i += 1) {
      await request(app)
        .put(`/api/activity/entries/${addDaysISO(TODAY, -i)}`)
        .set(auth)
        .send({ steps: 15000 });
    }
    // Sleep target met the last 7 nights (backdated so it applies to past days).
    await new DailyTargetsRepository().upsert(id, 'sleep_minutes', 480, addDaysISO(TODAY, -30));
    for (let i = 0; i < 7; i += 1) {
      const day = addDaysISO(TODAY, -i);
      await request(app)
        .post('/api/sleep')
        .set(auth)
        .send({
          bedtime: `${addDaysISO(day, -1)}T22:00:00.000Z`,
          wakeTime: `${day}T06:00:00.000Z`,
        });
    }

    const res = await request(app).get('/api/gamification').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.streaks.tracking).toEqual({ current: 7, longest: 7 });
    expect(res.body.data.streaks.sleepGoal.current).toBe(7);

    const badges = new Map(
      (res.body.data.badges as { key: string; awardedAt: string | null }[]).map((badge) => [
        badge.key,
        badge.awardedAt,
      ]),
    );
    expect(badges.get('tracking_7_days')).not.toBeNull();
    expect(badges.get('sleep_goal_7_consecutive')).not.toBeNull();
    expect(badges.get('steps_100k_total')).not.toBeNull(); // 7 × 15000 = 105k
    expect(badges.get('tracking_30_days')).toBeNull();
    expect(badges.get('workouts_10')).toBeNull();

    // Idempotent: a second fetch returns identical awards.
    const again = await request(app).get('/api/gamification').set(auth);
    expect(again.body.data.badges).toEqual(res.body.data.badges);
  });

  it('resets the current streak after a gap and awards the improvement badge', async () => {
    const { token } = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };

    // Two tracked days ending 5 days ago (a gap before today) → current 0.
    await request(app)
      .put(`/api/activity/entries/${addDaysISO(TODAY, -5)}`)
      .set(auth)
      .send({ steps: 1000 });
    await request(app)
      .put(`/api/activity/entries/${addDaysISO(TODAY, -6)}`)
      .set(auth)
      .send({ steps: 1000 });

    // Weight improved: 83 → 81.6.
    const typesRes = await request(app).get('/api/measurements/types').set(auth);
    const weightType = (typesRes.body.data.types as { id: string; key: string }[]).find(
      (type) => type.key === 'weight',
    );
    await request(app)
      .post('/api/measurements')
      .set(auth)
      .send({
        typeId: weightType?.id,
        value: 83,
        measuredAt: `${addDaysISO(TODAY, -6)}T09:00:00.000Z`,
      });
    await request(app)
      .post('/api/measurements')
      .set(auth)
      .send({
        typeId: weightType?.id,
        value: 81.6,
        measuredAt: `${addDaysISO(TODAY, -5)}T09:00:00.000Z`,
      });

    const res = await request(app).get('/api/gamification').set(auth);
    expect(res.body.data.streaks.tracking.current).toBe(0);

    const badges = new Map(
      (res.body.data.badges as { key: string; awardedAt: string | null }[]).map((badge) => [
        badge.key,
        badge.awardedAt,
      ]),
    );
    expect(badges.get('first_measurement_improvement')).not.toBeNull();
  });
});
