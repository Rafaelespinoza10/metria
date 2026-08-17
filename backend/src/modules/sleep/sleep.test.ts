import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import { UsersRepository } from '../users/users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const TIMEZONE = 'America/Mexico_City';

const app = createApp();
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `sleep-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Sleep Test',
      timezone: TIMEZONE,
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

function lastNight() {
  const wake = new Date(Date.now() - 60 * 60 * 1000);
  const bed = new Date(wake.getTime() - (7 * 60 + 34) * 60 * 1000);
  return { bedtime: bed.toISOString(), wakeTime: wake.toISOString(), wake };
}

describe.skipIf(!hasDatabase)('sleep', () => {
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

  it('computes duration and buckets on the wake-up local day', async () => {
    const { bedtime, wakeTime, wake } = lastNight();
    const res = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ bedtime, wakeTime, quality: 4 });

    expect(res.status).toBe(201);
    expect(res.body.data.entry.durationMinutes).toBe(454);
    expect(res.body.data.entry.localDate).toBe(localDateFor(wake, TIMEZONE));
    expect(res.body.data.entry.quality).toBe(4);
  });

  it('rejects a second entry for the same wake-up day with 409', async () => {
    const { bedtime, wakeTime } = lastNight();
    const res = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ bedtime, wakeTime });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('update recomputes duration when both instants change', async () => {
    const list = await request(app).get('/api/sleep').set('Authorization', `Bearer ${token}`);
    const entry = (list.body.data.entries as { id: string }[])[0];
    expect(entry).toBeDefined();

    const { wakeTime } = lastNight();
    const newBed = new Date(new Date(wakeTime).getTime() - 8 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .patch(`/api/sleep/${entry?.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bedtime: newBed, wakeTime, quality: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.entry.durationMinutes).toBe(480);
    expect(res.body.data.entry.quality).toBe(5);
  });

  it('rejects invalid windows and quality values', async () => {
    const { bedtime, wakeTime } = lastNight();
    const inverted = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ bedtime: wakeTime, wakeTime: bedtime });
    expect(inverted.status).toBe(400);

    const tooLong = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bedtime: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        wakeTime: new Date().toISOString(),
      });
    expect(tooLong.status).toBe(400);

    const badQuality = await request(app)
      .post('/api/sleep')
      .set('Authorization', `Bearer ${token}`)
      .send({ bedtime, wakeTime, quality: 6 });
    expect(badQuality.status).toBe(400);
  });

  it('sets and reads the sleep target in minutes', async () => {
    const put = await request(app)
      .put('/api/sleep/targets')
      .set('Authorization', `Bearer ${token}`)
      .send({ sleepMinutes: 480 });
    expect(put.status).toBe(200);
    expect(put.body.data.targets.sleep_minutes).toBe(480);
  });

  it('soft-deletes and answers 404 for foreign entries', async () => {
    const list = await request(app).get('/api/sleep').set('Authorization', `Bearer ${token}`);
    const entry = (list.body.data.entries as { id: string }[])[0];

    const foreign = await registerUser();
    const foreignPatch = await request(app)
      .patch(`/api/sleep/${entry?.id}`)
      .set('Authorization', `Bearer ${foreign.token}`)
      .send({ quality: 1 });
    expect(foreignPatch.status).toBe(404);

    const del = await request(app)
      .delete(`/api/sleep/${entry?.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const after = await request(app).get('/api/sleep').set('Authorization', `Bearer ${token}`);
    expect((after.body.data.entries as { id: string }[]).some((e) => e.id === entry?.id)).toBe(
      false,
    );
  });
});
