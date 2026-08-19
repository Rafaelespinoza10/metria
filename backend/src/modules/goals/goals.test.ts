import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { progressPercent } from './goals.service.js';
import { closeDb } from '../../database/client.js';
import { UsersRepository } from '../users/users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

const app = createApp();
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `goals-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Goals Test',
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

describe.skipIf(!hasDatabase)('goals', () => {
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    token = (await registerUser()).token;
    otherToken = (await registerUser()).token;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('creates a goal for every category', async () => {
    for (const category of ['lose_fat', 'gain_muscle', 'maintain', 'improve_habits']) {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ category, metric: 'weight', startValue: 82.3, targetValue: 78 });
      expect(res.status).toBe(201);
      expect(res.body.data.goal.category).toBe(category);
      expect(res.body.data.goal.status).toBe('active');
    }
  });

  it('requires measurementTypeId only for measurement goals', async () => {
    const missing = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'lose_fat', metric: 'measurement', targetValue: 80 });
    expect(missing.status).toBe(400);

    const typesRes = await request(app)
      .get('/api/measurements/types')
      .set('Authorization', `Bearer ${token}`);
    const waist = (typesRes.body.data.types as { id: string; key: string }[]).find(
      (type) => type.key === 'waist',
    );
    expect(waist).toBeDefined();

    const valid = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'lose_fat',
        metric: 'measurement',
        measurementTypeId: waist?.id,
        startValue: 90,
        targetValue: 85,
      });
    expect(valid.status).toBe(201);

    const unknownType = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'lose_fat',
        metric: 'measurement',
        measurementTypeId: crypto.randomUUID(),
        targetValue: 85,
      });
    expect(unknownType.status).toBe(400);
  });

  it('lists goals filtered by status and updates status', async () => {
    const created = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'improve_habits', metric: 'steps', targetValue: 10000 });
    const goalId = created.body.data.goal.id as string;

    const patched = await request(app)
      .patch(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'achieved' });
    expect(patched.status).toBe(200);
    expect(patched.body.data.goal.status).toBe('achieved');

    const achieved = await request(app)
      .get('/api/goals?status=achieved')
      .set('Authorization', `Bearer ${token}`);
    const ids = (achieved.body.data.goals as { id: string }[]).map((goal) => goal.id);
    expect(ids).toContain(goalId);

    const active = await request(app)
      .get('/api/goals?status=active')
      .set('Authorization', `Bearer ${token}`);
    const activeIds = (active.body.data.goals as { id: string }[]).map((goal) => goal.id);
    expect(activeIds).not.toContain(goalId);
  });

  it('never exposes another user goals and answers 404 for foreign ids', async () => {
    const created = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'maintain', metric: 'protein', targetValue: 170 });
    const goalId = created.body.data.goal.id as string;

    const foreignGet = await request(app)
      .get(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(foreignGet.status).toBe(404);

    const foreignPatch = await request(app)
      .patch(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'abandoned' });
    expect(foreignPatch.status).toBe(404);

    const otherList = await request(app)
      .get('/api/goals')
      .set('Authorization', `Bearer ${otherToken}`);
    const otherIds = (otherList.body.data.goals as { id: string }[]).map((goal) => goal.id);
    expect(otherIds).not.toContain(goalId);
  });

  it('computes progress from the latest measurement of the goal metric', async () => {
    const user = await registerUser();
    const types = await request(app)
      .get('/api/measurements/types')
      .set('Authorization', `Bearer ${user.token}`);
    const weightType = (types.body.data.types as { id: string; key: string }[]).find(
      (type) => type.key === 'weight',
    );
    expect(weightType).toBeDefined();

    await request(app)
      .post('/api/measurements')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ typeId: weightType?.id, value: 85, measuredAt: new Date().toISOString() });

    const created = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ category: 'lose_fat', metric: 'weight', startValue: 90, targetValue: 80 });
    expect(created.status).toBe(201);
    expect(created.body.data.goal.progress).toEqual({ current: 85, percent: 50 });

    const list = await request(app).get('/api/goals').set('Authorization', `Bearer ${user.token}`);
    const goal = (
      list.body.data.goals as { id: string; progress: { current: number; percent: number } }[]
    ).find((row) => row.id === created.body.data.goal.id);
    expect(goal?.progress).toEqual({ current: 85, percent: 50 });

    // Habit metrics stay null.
    const habit = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ category: 'improve_habits', metric: 'steps', targetValue: 10000 });
    expect(habit.body.data.goal.progress).toBeNull();
  });

  it('soft delete hides the goal from list and get', async () => {
    const created = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'lose_fat', metric: 'body_fat', targetValue: 15 });
    const goalId = created.body.data.goal.id as string;

    const del = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const get = await request(app)
      .get(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});

describe('progressPercent', () => {
  it('is direction-agnostic and clamped', () => {
    expect(progressPercent(90, 80, 85)).toBe(50); // losing
    expect(progressPercent(60, 70, 65)).toBe(50); // gaining
    expect(progressPercent(90, 80, 79)).toBe(100); // past the target clamps
    expect(progressPercent(90, 80, 95)).toBe(0); // regression clamps
    expect(progressPercent(80, 80, 75)).toBeNull(); // degenerate range
  });
});
