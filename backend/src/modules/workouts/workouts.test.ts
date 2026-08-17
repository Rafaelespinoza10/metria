import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
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
      email: `workouts-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Workouts Test',
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

const PUSH_DAY = {
  name: 'Push day',
  performedAt: new Date().toISOString(),
  durationMinutes: 60,
  exercises: [
    {
      name: 'Bench press',
      muscleGroup: 'chest',
      sets: [
        { repetitions: 8, weightKg: 80, rpe: 8 },
        { repetitions: 6, weightKg: 85, rpe: 9 },
      ],
    },
    {
      name: 'Overhead press',
      muscleGroup: 'shoulders',
      sets: [{ repetitions: 10, weightKg: 40 }],
    },
  ],
};

describe.skipIf(!hasDatabase)('workouts', () => {
  let token: string;

  beforeAll(async () => {
    token = (await registerUser()).token;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('creates a workout with ordered exercises and sets', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send(PUSH_DAY);

    expect(res.status).toBe(201);
    const workout = res.body.data.workout as {
      exercises: { name: string; position: number; sets: { repetitions: number }[] }[];
    };
    expect(workout.exercises.map((e) => e.name)).toEqual(['Bench press', 'Overhead press']);
    expect(workout.exercises[0]?.sets).toHaveLength(2);
    expect(workout.exercises[0]?.sets[1]?.repetitions).toBe(6);
  });

  it('lists workouts and filters by date range', async () => {
    const list = await request(app).get('/api/workouts').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect((list.body.data.workouts as unknown[]).length).toBeGreaterThanOrEqual(1);

    const past = await request(app)
      .get('/api/workouts?from=2000-01-01&to=2000-12-31')
      .set('Authorization', `Bearer ${token}`);
    expect(past.body.data.workouts).toHaveLength(0);
  });

  it('update replaces the exercise tree; field-only updates keep it', async () => {
    const created = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send(PUSH_DAY);
    const workoutId = created.body.data.workout.id as string;

    const replaced = await request(app)
      .patch(`/api/workouts/${workoutId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        exercises: [{ name: 'Incline press', sets: [{ repetitions: 12, weightKg: 60 }] }],
      });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.workout.exercises).toHaveLength(1);
    expect(replaced.body.data.workout.exercises[0].name).toBe('Incline press');

    const renamed = await request(app)
      .patch(`/api/workouts/${workoutId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Push day B' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.workout.name).toBe('Push day B');
    expect(renamed.body.data.workout.exercises).toHaveLength(1);
  });

  it('rejects invalid workouts (no exercises, zero reps, rpe out of range)', async () => {
    const base = { name: 'Bad', performedAt: new Date().toISOString() };
    const noExercises = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...base, exercises: [] });
    expect(noExercises.status).toBe(400);

    const zeroReps = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...base, exercises: [{ name: 'x', sets: [{ repetitions: 0 }] }] });
    expect(zeroReps.status).toBe(400);

    const badRpe = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...base, exercises: [{ name: 'x', sets: [{ repetitions: 5, rpe: 11 }] }] });
    expect(badRpe.status).toBe(400);
  });

  it('soft-deletes and answers 404 for foreign workouts', async () => {
    const created = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send(PUSH_DAY);
    const workoutId = created.body.data.workout.id as string;

    const foreign = await registerUser();
    const foreignGet = await request(app)
      .get(`/api/workouts/${workoutId}`)
      .set('Authorization', `Bearer ${foreign.token}`);
    expect(foreignGet.status).toBe(404);

    const del = await request(app)
      .delete(`/api/workouts/${workoutId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const afterDelete = await request(app)
      .get(`/api/workouts/${workoutId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(afterDelete.status).toBe(404);
  });
});
