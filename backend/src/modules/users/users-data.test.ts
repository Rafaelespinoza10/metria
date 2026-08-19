import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { UsersRepository } from './users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

const app = createApp();
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

const TIMEZONE = 'UTC';
// Deterministic anchor in the recent past: every write schema rejects future timestamps.
const DAY_MS = 24 * 60 * 60 * 1000;
const anchor = new Date(Date.now() - 10 * DAY_MS);

function isoAt(daysAgo: number, hours: number): string {
  const date = new Date(anchor.getTime() - daysAgo * DAY_MS);
  date.setUTCHours(hours, 0, 0, 0);
  return date.toISOString();
}

function localDateAt(daysAgo: number): string {
  return isoAt(daysAgo, 12).slice(0, 10);
}

async function registerUser() {
  const email = `users-data-${crypto.randomUUID()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name: 'Data Test', timezone: TIMEZONE });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { email, token: data.token, id: data.user.id };
}

/** Two meals on one day, plus a workout, a night of sleep, activity and a measurement. */
async function seedAccount(token: string) {
  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

  for (const [index, category] of ['breakfast', 'dinner'].entries()) {
    const res = await auth(request(app).post('/api/nutrition/meals')).send({
      category,
      name: `Meal ${index}`,
      eatenAt: isoAt(1, 8 + index * 6),
      items: [{ name: 'Oats', grams: 80, calories: 300, protein: 10, carbohydrates: 50, fat: 6 }],
    });
    expect(res.status).toBe(201);
  }

  const workout = await auth(request(app).post('/api/workouts')).send({
    name: 'Push day',
    performedAt: isoAt(1, 18),
    durationMinutes: 55,
    exercises: [
      {
        name: 'Bench press',
        muscleGroup: 'chest',
        sets: [
          { repetitions: 8, weightKg: 60 },
          { repetitions: 6, weightKg: 65, rpe: 8 },
        ],
      },
    ],
  });
  expect(workout.status).toBe(201);

  const sleep = await auth(request(app).post('/api/sleep')).send({
    bedtime: isoAt(2, 23),
    wakeTime: isoAt(1, 7),
    quality: 4,
  });
  expect(sleep.status).toBe(201);

  const activity = await auth(request(app).put(`/api/activity/entries/${localDateAt(1)}`)).send({
    steps: 8000,
    activeMinutes: 40,
  });
  expect(activity.status).toBe(200);

  const types = await auth(request(app).get('/api/measurements/types'));
  const weightType = (types.body.data.types as { id: string; key: string }[]).find(
    (type) => type.key === 'weight',
  );
  const measurement = await auth(request(app).post('/api/measurements')).send({
    typeId: weightType?.id,
    value: 78.4,
    measuredAt: isoAt(1, 7),
  });
  expect(measurement.status).toBe(201);

  const goal = await auth(request(app).post('/api/goals')).send({
    category: 'lose_fat',
    metric: 'weight',
    startValue: 80,
    targetValue: 74,
    targetDate: localDateAt(-30),
  });
  expect(goal.status).toBe(201);
}

describe.skipIf(!hasDatabase)('users data (profile, stats, export/import)', () => {
  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('stores body data and rejects out-of-range values', async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ birthDate: '1994-05-17', heightCm: 178.5 });
    expect(res.status).toBe(200);
    expect(res.body.data.user.birthDate).toBe('1994-05-17');
    expect(res.body.data.user.heightCm).toBe(178.5);

    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.data.user.heightCm).toBe(178.5);

    const tooTall = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ heightCm: 300 });
    expect(tooTall.status).toBe(400);

    const unborn = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ birthDate: '2999-01-01' });
    expect(unborn.status).toBe(400);
  });

  it('reports journey stats that match what was logged', async () => {
    const { token } = await registerUser();
    await seedAccount(token);

    const res = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const stats = res.body.data;
    expect(stats.memberSince).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Meals, workout, sleep and activity all land on the same local day.
    expect(stats.daysTracked).toBe(1);
    expect(stats.totals).toMatchObject({
      meals: 2,
      workouts: 1,
      sleepNights: 1,
      measurements: 1,
      photos: 0,
      steps: 8000,
    });
  });

  it('exports every collection with resolvable measurement type keys', async () => {
    const { token } = await registerUser();
    await seedAccount(token);

    const res = await request(app)
      .get('/api/users/me/export')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const doc = res.body.data;
    expect(doc.version).toBe(1);
    expect(doc.profile.email).toBeDefined();
    expect(doc.meals).toHaveLength(2);
    expect(doc.meals[0].items).toHaveLength(1);
    expect(doc.workouts).toHaveLength(1);
    expect(doc.workouts[0].exercises[0].sets).toHaveLength(2);
    expect(doc.sleep).toHaveLength(1);
    expect(doc.activity).toHaveLength(1);
    expect(doc.measurements[0].typeKey).toBe('weight');
    expect(doc.goals).toHaveLength(1);
  });

  it('restores an export into a fresh account and skips duplicate days on re-import', async () => {
    const source = await registerUser();
    await seedAccount(source.token);
    const exported = await request(app)
      .get('/api/users/me/export')
      .set('Authorization', `Bearer ${source.token}`);
    const doc = exported.body.data;

    const target = await registerUser();
    const first = await request(app)
      .post('/api/users/me/import')
      .set('Authorization', `Bearer ${target.token}`)
      .send(doc);

    expect(first.status).toBe(200);
    expect(first.body.data.imported).toMatchObject({
      meals: 2,
      workouts: 1,
      sleep: 1,
      activity: 1,
      measurements: 1,
      goals: 1,
    });

    const stats = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${target.token}`);
    expect(stats.body.data.totals).toMatchObject({
      meals: 2,
      workouts: 1,
      sleepNights: 1,
      measurements: 1,
      steps: 8000,
    });

    const workouts = await request(app)
      .get('/api/workouts')
      .set('Authorization', `Bearer ${target.token}`);
    expect(workouts.body.data.workouts[0].name).toBe('Push day');
    expect(workouts.body.data.workouts[0].exercises[0].sets).toHaveLength(2);

    // Day-unique collections keep the existing rows; list data appends again.
    const second = await request(app)
      .post('/api/users/me/import')
      .set('Authorization', `Bearer ${target.token}`)
      .send(doc);
    expect(second.status).toBe(200);
    expect(second.body.data.imported).toMatchObject({ sleep: 0, activity: 0, meals: 2 });
  });

  it('rejects a document that is not a Metria export', async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .post('/api/users/me/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 99, meals: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication for stats, export and import', async () => {
    for (const call of [
      request(app).get('/api/users/me/stats'),
      request(app).get('/api/users/me/export'),
      request(app).post('/api/users/me/import').send({ version: 1 }),
    ]) {
      const res = await call;
      expect(res.status).toBe(401);
    }
  });
});
