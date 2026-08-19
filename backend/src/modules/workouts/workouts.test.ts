import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { LocalStorageService } from '../../shared/storage/local-storage.service.js';
import { UsersRepository } from '../users/users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d4944415478da63fcffff3f0300050201f4d3e1f000' +
    '00000049454e44ae426082',
  'hex',
);

const storageDir = mkdtempSync(path.join(tmpdir(), 'metria-workouts-'));
const app = createApp({ storage: new LocalStorageService(storageDir) });
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
    await rm(storageDir, { recursive: true, force: true });
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

  it('searches by workout or exercise name and paginates with totals', async () => {
    const { token: t2 } = await registerUser();
    const auth = { Authorization: `Bearer ${t2}` };
    const mk = (name: string, exercise: string) =>
      request(app)
        .post('/api/workouts')
        .set(auth)
        .send({
          name,
          performedAt: new Date().toISOString(),
          exercises: [{ name: exercise, sets: [{ repetitions: 8, weightKg: 60 }] }],
        });
    await mk('Leg day', 'Back squat');
    await mk('Push day', 'Bench press');
    await mk('Pull day', 'Deadlift');

    // Search hits the workout name…
    const byName = await request(app).get('/api/workouts?search=push').set(auth);
    expect(byName.body.data.total).toBe(1);
    expect(byName.body.data.workouts[0].name).toBe('Push day');

    // …and the exercise name.
    const byExercise = await request(app).get('/api/workouts?search=deadlift').set(auth);
    expect(byExercise.body.data.total).toBe(1);
    expect(byExercise.body.data.workouts[0].name).toBe('Pull day');

    // Pagination: page size 2 with a stable total.
    const page1 = await request(app).get('/api/workouts?limit=2&offset=0').set(auth);
    expect(page1.body.data.total).toBe(3);
    expect(page1.body.data.workouts).toHaveLength(2);
    const page2 = await request(app).get('/api/workouts?limit=2&offset=2').set(auth);
    expect(page2.body.data.workouts).toHaveLength(1);
    const page1Ids = (page1.body.data.workouts as { id: string }[]).map((w) => w.id);
    expect(page1Ids).not.toContain(page2.body.data.workouts[0].id);
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

  it('uploads an exercise photo and serves it back under the user prefix', async () => {
    const uploaded = await request(app)
      .post('/api/workouts/exercise-photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', PNG_BYTES, { filename: 'bench.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);
    const photo = uploaded.body.data.photo as { imageKey: string; imageUrl: string };
    expect(photo.imageKey).toMatch(/^users\/.+\/exercises\/.+\.png$/);
    expect(photo.imageUrl).toBe(`/api/uploads/${photo.imageKey}`);

    const served = await request(app).get(photo.imageUrl).set('Authorization', `Bearer ${token}`);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
  });

  it('rejects non-image uploads', async () => {
    const res = await request(app)
      .post('/api/workouts/exercise-photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
  });

  it('stores an exercise imageKey and exposes it as imageUrl; rejects foreign keys', async () => {
    const uploaded = await request(app)
      .post('/api/workouts/exercise-photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', PNG_BYTES, { filename: 'bench.png', contentType: 'image/png' });
    const imageKey = uploaded.body.data.photo.imageKey as string;

    const created = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...PUSH_DAY,
        exercises: [{ ...PUSH_DAY.exercises[0], imageKey }],
      });
    expect(created.status).toBe(201);
    expect(created.body.data.workout.exercises[0].imageUrl).toBe(`/api/uploads/${imageKey}`);
    expect(created.body.data.workout.exercises[0].imageKey).toBe(imageKey);

    const foreign = await registerUser();
    const stolen = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${foreign.token}`)
      .send({
        ...PUSH_DAY,
        exercises: [{ ...PUSH_DAY.exercises[0], imageKey }],
      });
    expect(stolen.status).toBe(400);
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
