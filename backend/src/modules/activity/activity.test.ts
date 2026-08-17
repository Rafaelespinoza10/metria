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
      email: `activity-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Activity Test',
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

const TODAY = new Date().toISOString().slice(0, 10);

describe.skipIf(!hasDatabase)('activity', () => {
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

  it('returns a zero-filled entry for an untracked day', async () => {
    const res = await request(app)
      .get(`/api/activity/entries/${TODAY}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.entry).toMatchObject({ localDate: TODAY, steps: 0, activeMinutes: 0 });
  });

  it('upserts a day idempotently and merges partial updates', async () => {
    const first = await request(app)
      .put(`/api/activity/entries/${TODAY}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ steps: 8420, activeMinutes: 45 });
    expect(first.status).toBe(200);
    expect(first.body.data.entry.steps).toBe(8420);

    const second = await request(app)
      .put(`/api/activity/entries/${TODAY}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ steps: 10120 });
    expect(second.status).toBe(200);
    expect(second.body.data.entry.steps).toBe(10120);
    // Untouched field survives the partial update.
    expect(second.body.data.entry.activeMinutes).toBe(45);
  });

  it('lists a date range in ascending order', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await request(app)
      .put(`/api/activity/entries/${yesterday}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ steps: 6000 });

    const res = await request(app)
      .get(`/api/activity/entries?from=${yesterday}&to=${TODAY}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const dates = (res.body.data.entries as { localDate: string }[]).map((e) => e.localDate);
    expect(dates).toEqual([yesterday, TODAY]);
  });

  it('rejects future dates and out-of-range values', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const future = await request(app)
      .put(`/api/activity/entries/${tomorrow}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ steps: 100 });
    expect(future.status).toBe(400);

    const tooMany = await request(app)
      .put(`/api/activity/entries/${TODAY}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ steps: 300000 });
    expect(tooMany.status).toBe(400);
  });

  it('sets and reads activity targets', async () => {
    const put = await request(app)
      .put('/api/activity/targets')
      .set('Authorization', `Bearer ${token}`)
      .send({ steps: 10000, activeMinutes: 45 });
    expect(put.status).toBe(200);
    expect(put.body.data.targets).toEqual({ steps: 10000, active_minutes: 45 });

    const get = await request(app)
      .get('/api/activity/targets')
      .set('Authorization', `Bearer ${token}`);
    expect(get.body.data.targets.steps).toBe(10000);
  });
});
