import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { InsightAggregatesInput, InsightsPort } from '../../ai/ports.js';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { DailyTargetsRepository } from '../nutrition/daily-targets.repository.js';
import { addDaysISO, isMonday, mondayOf } from '../../shared/utils/date-range.js';
import { UsersRepository } from '../users/users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

class FakeInsights implements InsightsPort {
  calls: InsightAggregatesInput[] = [];
  nextResult: unknown = { content: 'Steady week: sleep and steps both improved.' };
  shouldThrow = false;

  generateInsight(input: InsightAggregatesInput): Promise<unknown> {
    this.calls.push(input);
    if (this.shouldThrow) return Promise.reject(new Error('upstream down'));
    return Promise.resolve(this.nextResult);
  }
}

const insightsPort = new FakeInsights();
const app = createApp({ insightsPort });
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

// Users register with UTC so local dates match the ISO dates we seed.
async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `insights-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Insights Test',
      timezone: 'UTC',
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

describe.skipIf(!hasDatabase)('AI insights', () => {
  let token: string;
  let userId: string;
  // Two weeks back: every seeded instant is safely in the past, independent of CI clock.
  const week = addDaysISO(mondayOf(new Date().toISOString().slice(0, 10)), -14);
  const prevWeek = addDaysISO(week, -7);

  beforeAll(async () => {
    const registered = await registerUser();
    token = registered.token;
    userId = registered.id;
    const auth = { Authorization: `Bearer ${token}` };

    // Backdated so the target is in effect for both seeded (past) weeks.
    const targetsRepository = new DailyTargetsRepository();
    await targetsRepository.upsert(userId, 'protein', 100, prevWeek);
    await targetsRepository.upsert(userId, 'sleep_minutes', 480, prevWeek);

    // Previous week: two activity days (6000 / 7000 steps), one sleep night (400 min),
    // one meal with 80 g protein (below target), one weight 82.5.
    const seed1 = await request(app)
      .put(`/api/activity/entries/${prevWeek}`)
      .set(auth)
      .send({ steps: 6000 });
    const seed2 = await request(app)
      .put(`/api/activity/entries/${addDaysISO(prevWeek, 1)}`)
      .set(auth)
      .send({ steps: 7000 });
    // Fail loudly if seeding ever breaks — silent seed failures make flaky asserts.
    expect(seed1.status).toBe(200);
    expect(seed2.status).toBe(200);
    await request(app)
      .post('/api/sleep')
      .set(auth)
      .send({
        bedtime: `${prevWeek}T00:00:00.000Z`,
        wakeTime: `${prevWeek}T06:40:00.000Z`,
      });
    await request(app)
      .post('/api/nutrition/meals')
      .set(auth)
      .send({
        category: 'lunch',
        name: 'Prev week lunch',
        eatenAt: `${prevWeek}T12:00:00.000Z`,
        items: [{ name: 'Bowl', calories: 700, protein: 80, carbohydrates: 60, fat: 20 }],
      });

    // "Current" week under test (its Monday): 9000 steps, 480 min sleep, one meal, one workout.
    await request(app).put(`/api/activity/entries/${week}`).set(auth).send({ steps: 9000 });
    await request(app)
      .post('/api/sleep')
      .set(auth)
      .send({ bedtime: `${week}T00:00:00.000Z`, wakeTime: `${week}T08:00:00.000Z` });
    await request(app)
      .post('/api/nutrition/meals')
      .set(auth)
      .send({
        category: 'lunch',
        name: 'Monday lunch',
        eatenAt: `${week}T12:00:00.000Z`,
        items: [{ name: 'Chicken bowl', calories: 800, protein: 120, carbohydrates: 70, fat: 25 }],
      });
    await request(app)
      .post('/api/workouts')
      .set(auth)
      .send({
        name: 'Push day',
        performedAt: `${week}T10:00:00.000Z`,
        exercises: [{ name: 'Bench', sets: [{ repetitions: 8, weightKg: 80 }] }],
      });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('generates a weekly insight from hand-checkable deterministic aggregates', async () => {
    const res = await request(app)
      .get(`/api/insights/weekly?week=${week}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.insight.content).toContain('Steady week');

    const aggregates = res.body.data.insight.aggregates as {
      current: Record<string, unknown>;
      previous: Record<string, unknown>;
      targets: Record<string, unknown>;
    };
    expect(aggregates.previous.avgSteps).toBe(6500);
    expect(aggregates.previous.avgSleepMinutes).toBe(400);
    expect(aggregates.previous.proteinGoalCompletion).toBe(0);
    expect(aggregates.current.avgSteps).toBe(9000);
    expect(aggregates.current.avgSleepMinutes).toBe(480);
    expect(aggregates.current.proteinGoalCompletion).toBe(100);
    expect(aggregates.current.workouts).toBe(1);
    expect(aggregates.targets.protein).toBe(100);

    // The port received the aggregates — code calculated, AI only interpreted.
    const call = insightsPort.calls.find((c) => c.period === 'weekly');
    expect(call).toBeDefined();
  });

  it('caches per period: a second request makes no new AI call', async () => {
    const callsBefore = insightsPort.calls.length;
    const res = await request(app)
      .get(`/api/insights/weekly?week=${week}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(insightsPort.calls.length).toBe(callsBefore);
  });

  it('generates a daily insight with metric-vs-target aggregates', async () => {
    const res = await request(app)
      .get(`/api/insights/daily?date=${week}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const aggregates = res.body.data.insight.aggregates as {
      steps: { value: number; target: number | null };
      sleepMinutes: { value: number };
      workouts: number;
    };
    expect(aggregates.steps.value).toBe(9000);
    expect(aggregates.sleepMinutes.value).toBe(480);
    expect(aggregates.workouts).toBe(1);
  });

  it('rejects a non-Monday week and future daily dates', async () => {
    const tuesday = addDaysISO(week, 1);
    expect(isMonday(tuesday)).toBe(false);
    const badWeek = await request(app)
      .get(`/api/insights/weekly?week=${tuesday}`)
      .set('Authorization', `Bearer ${token}`);
    expect(badWeek.status).toBe(400);

    const future = addDaysISO(new Date().toISOString().slice(0, 10), 2);
    const badDate = await request(app)
      .get(`/api/insights/daily?date=${future}`)
      .set('Authorization', `Bearer ${token}`);
    expect(badDate.status).toBe(400);
  });

  it('returns 503 and persists nothing when the AI response is unusable', async () => {
    const fresh = await registerUser();
    insightsPort.nextResult = { garbage: true };

    const res = await request(app)
      .get('/api/insights/daily')
      .set('Authorization', `Bearer ${fresh.token}`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');

    // Retry succeeds once the port works again — nothing broken was cached.
    insightsPort.nextResult = { content: 'A quiet day with room for a short walk.' };
    const retry = await request(app)
      .get('/api/insights/daily')
      .set('Authorization', `Bearer ${fresh.token}`);
    expect(retry.status).toBe(200);
    expect(retry.body.data.insight.content).toContain('quiet day');
  });
});
