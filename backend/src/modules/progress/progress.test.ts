import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { addDaysISO } from '../../shared/utils/date-range.js';
import { DailyTargetsRepository } from '../nutrition/daily-targets.repository.js';
import { UsersRepository } from '../users/users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

const app = createApp();
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `progress-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Progress Test',
      timezone: 'UTC',
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

describe.skipIf(!hasDatabase)('progress', () => {
  let token: string;
  let userId: string;
  // A fixed, fully past anchor date (3 weeks back) so seeding never hits "future" checks.
  const anchor = addDaysISO(new Date().toISOString().slice(0, 10), -21);

  beforeAll(async () => {
    const registered = await registerUser();
    token = registered.token;
    userId = registered.id;
    const auth = { Authorization: `Bearer ${token}` };

    // Targets backdated far enough to cover both scoring windows.
    const targetsRepository = new DailyTargetsRepository();
    const targetStart = addDaysISO(anchor, -20);
    await targetsRepository.upsert(userId, 'calories', 2000, targetStart);
    await targetsRepository.upsert(userId, 'protein', 100, targetStart);
    await targetsRepository.upsert(userId, 'steps', 10000, targetStart);
    await targetsRepository.upsert(userId, 'sleep_minutes', 480, targetStart);

    // Current window (ends at anchor): one perfect day at the anchor.
    await request(app)
      .post('/api/nutrition/meals')
      .set(auth)
      .send({
        category: 'lunch',
        name: 'Perfect day',
        eatenAt: `${anchor}T12:00:00.000Z`,
        items: [{ name: 'Meal', calories: 2000, protein: 100, carbohydrates: 200, fat: 60 }],
      });
    await request(app).put(`/api/activity/entries/${anchor}`).set(auth).send({ steps: 10000 });
    await request(app)
      .post('/api/sleep')
      .set(auth)
      .send({ bedtime: `${anchor}T00:00:00.000Z`, wakeTime: `${anchor}T08:00:00.000Z` });

    // Previous window: one half-adherence day (steps only, 5000/10000).
    const prevDay = addDaysISO(anchor, -7);
    await request(app).put(`/api/activity/entries/${prevDay}`).set(auth).send({ steps: 5000 });

    // Measurements for body deltas: weight 83.0 at today-25 → 81.6 at the anchor
    // (today-21). Both inside the 30d window, both outside the 7d window.
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
        measuredAt: `${addDaysISO(anchor, -4)}T09:00:00.000Z`,
      });
    await request(app)
      .post('/api/measurements')
      .set(auth)
      .send({ typeId: weightType?.id, value: 81.6, measuredAt: `${anchor}T09:00:00.000Z` });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('computes the hand-checked score, components, and week-over-week delta', async () => {
    const res = await request(app)
      .get(`/api/progress/score?date=${anchor}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Current window: nutrition 100, activity 100, sleep 100, consistency 1/7 ≈ 14.
    expect(res.body.data.components).toEqual({
      nutrition: 100,
      activity: 100,
      sleep: 100,
      consistency: 14,
    });
    expect(res.body.data.score).toBe(79); // (100+100+100+14)/4 = 78.5 → weighted rounding
    // Previous window: only activity 50 and consistency 14 → (50*.25+14*.25)/.5 = 32.
    expect(res.body.data.previousScore).toBe(32);
    expect(res.body.data.delta).toBe(res.body.data.score - 32);
  });

  it('renormalizes weights when components have no data and scores 0 with none', async () => {
    const fresh = await registerUser();
    const res = await request(app)
      .get('/api/progress/score')
      .set('Authorization', `Bearer ${fresh.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.score).toBe(0);
    expect(res.body.data.components).toEqual({
      nutrition: null,
      activity: null,
      sleep: null,
      consistency: null,
    });
  });

  it('returns the today panel from deterministic aggregates', async () => {
    const res = await request(app)
      .get(`/api/progress/today?date=${anchor}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.calories).toEqual({ value: 2000, target: 2000 });
    expect(res.body.data.steps).toEqual({ value: 10000, target: 10000 });
    expect(res.body.data.sleepMinutes.value).toBe(480);
  });

  it('computes body deltas per window', async () => {
    const res = await request(app)
      .get('/api/progress/body?window=30d')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const weight = (
      res.body.data.metrics as { key: string; start: number; end: number; delta: number }[]
    ).find((metric) => metric.key === 'weight');
    expect(weight).toMatchObject({ start: 83, end: 81.6, delta: -1.4 });

    const shortWindow = await request(app)
      .get('/api/progress/body?window=7d')
      .set('Authorization', `Bearer ${token}`);
    const weight7 = (shortWindow.body.data.metrics as { key: string; delta: number | null }[]).find(
      (metric) => metric.key === 'weight',
    );
    // Both measurements are older than 7 days: no delta in that window.
    expect(weight7?.delta).toBeNull();
  });

  it('returns the 30-day series with per-day values, zeros on empty days, and averages', async () => {
    const res = await request(app)
      .get('/api/progress/trends?days=30')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const data = res.body.data as {
      days: number;
      from: string;
      to: string;
      targets: Record<string, number | null>;
      averages: Record<string, number | null>;
      series: {
        date: string;
        calories: number;
        steps: number;
        sleepMinutes: number;
        tracked: boolean;
      }[];
    };
    expect(data.days).toBe(30);
    expect(data.series).toHaveLength(30);
    expect(data.series[0]?.date).toBe(data.from);
    expect(data.series[29]?.date).toBe(data.to);

    // The fully-logged anchor day.
    const anchorEntry = data.series.find((entry) => entry.date === anchor);
    expect(anchorEntry).toEqual({
      date: anchor,
      calories: 2000,
      steps: 10000,
      sleepMinutes: 480,
      tracked: true,
    });

    // The steps-only day still counts as tracked; other metrics are zero, not gaps.
    const stepsOnly = data.series.find((entry) => entry.date === addDaysISO(anchor, -7));
    expect(stepsOnly).toEqual({
      date: addDaysISO(anchor, -7),
      calories: 0,
      steps: 5000,
      sleepMinutes: 0,
      tracked: true,
    });

    // An untracked day is all zeros.
    const empty = data.series.find((entry) => entry.date === addDaysISO(anchor, 1));
    expect(empty).toEqual({
      date: addDaysISO(anchor, 1),
      calories: 0,
      steps: 0,
      sleepMinutes: 0,
      tracked: false,
    });

    expect(data.targets).toEqual({ calories: 2000, protein: 100, steps: 10000, sleepMinutes: 480 });
    // Tracked-day means: calories over 1 meal day, steps over 2 activity days.
    expect(data.averages).toEqual({
      calories: 2000,
      protein: 100,
      steps: 7500,
      sleepMinutes: 480,
    });
  });

  it('defaults trends to the empty last 7 days and rejects other windows', async () => {
    const res = await request(app)
      .get('/api/progress/trends')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.days).toBe(7);
    expect(res.body.data.series).toHaveLength(7);
    // Nothing was seeded in the last 7 days.
    expect((res.body.data.series as { tracked: boolean }[]).every((entry) => !entry.tracked)).toBe(
      true,
    );
    expect(res.body.data.averages).toEqual({
      calories: null,
      protein: null,
      steps: null,
      sleepMinutes: null,
    });

    const bad = await request(app)
      .get('/api/progress/trends?days=10')
      .set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);
  });

  it('builds the 30-day report from the seeded data', async () => {
    const res = await request(app)
      .get('/api/progress/report')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const report = res.body.data as {
      generatedAt: string;
      period: { from: string; to: string };
      user: { name: string; email: string; memberSince: string };
      score: { score: number; previousScore: number; delta: number };
      averages: Record<string, number | null>;
      targets: Record<string, number | null>;
      body: { metrics: { key: string; delta: number | null }[] };
      tracking: { trackedDays: number; totalDays: number; streak: { current: number } };
      badges: { earned: number; total: number };
    };

    expect(report.period.to).toBe(report.generatedAt);
    expect(report.period.from).toBe(addDaysISO(report.period.to, -29));
    expect(report.user.name).toBe('Progress Test');
    expect(report.user.memberSince).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(report.averages).toEqual({
      calories: 2000,
      protein: 100,
      steps: 7500,
      sleepMinutes: 480,
    });
    expect(report.targets.calories).toBe(2000);
    const weight = report.body.metrics.find((metric) => metric.key === 'weight');
    expect(weight?.delta).toBe(-1.4);
    // Anchor day + the steps-only day; measurements alone never count as tracked.
    expect(report.tracking).toMatchObject({ trackedDays: 2, totalDays: 30 });
    expect(report.badges.earned).toBe(0);
  });

  it('reports zeros and nulls for an empty account', async () => {
    const fresh = await registerUser();
    const res = await request(app)
      .get('/api/progress/report')
      .set('Authorization', `Bearer ${fresh.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.score.score).toBe(0);
    expect(res.body.data.averages).toEqual({
      calories: null,
      protein: null,
      steps: null,
      sleepMinutes: null,
    });
    expect(res.body.data.tracking).toMatchObject({
      trackedDays: 0,
      streak: { current: 0, longest: 0 },
    });
  });

  it('rejects future dates and invalid windows', async () => {
    const future = addDaysISO(new Date().toISOString().slice(0, 10), 2);
    const badDate = await request(app)
      .get(`/api/progress/score?date=${future}`)
      .set('Authorization', `Bearer ${token}`);
    expect(badDate.status).toBe(400);

    const badWindow = await request(app)
      .get('/api/progress/body?window=1y')
      .set('Authorization', `Bearer ${token}`);
    expect(badWindow.status).toBe(400);
  });
});
