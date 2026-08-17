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

const storageDir = mkdtempSync(path.join(tmpdir(), 'metria-storage-'));
const app = createApp({ storage: new LocalStorageService(storageDir) });
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

// Tiny valid 1x1 PNG.
const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d4944415478da63fcffff3f0300050201f4d3e1f000' +
    '00000049454e44ae426082',
  'hex',
);

async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `measure-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Measure Test',
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

describe.skipIf(!hasDatabase)('measurements', () => {
  let token: string;
  let weightTypeId: string;

  beforeAll(async () => {
    token = (await registerUser()).token;
    const typesRes = await request(app)
      .get('/api/measurements/types')
      .set('Authorization', `Bearer ${token}`);
    const types = typesRes.body.data.types as { id: string; key: string; unit: string }[];
    expect(types.length).toBeGreaterThanOrEqual(17);
    const weight = types.find((type) => type.key === 'weight');
    if (!weight) throw new Error('weight type missing from seed');
    weightTypeId = weight.id;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
    await rm(storageDir, { recursive: true, force: true });
  });

  it('creates, lists, updates, and soft-deletes a measurement', async () => {
    const created = await request(app)
      .post('/api/measurements')
      .set('Authorization', `Bearer ${token}`)
      .send({ typeId: weightTypeId, value: 82.3, measuredAt: new Date().toISOString() });
    expect(created.status).toBe(201);
    const measurementId = created.body.data.measurement.id as string;

    const list = await request(app)
      .get(`/api/measurements?typeId=${weightTypeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(
      (list.body.data.measurements as { id: string }[]).some((m) => m.id === measurementId),
    ).toBe(true);

    const updated = await request(app)
      .patch(`/api/measurements/${measurementId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 82.1, notes: 'after breakfast' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.measurement.value).toBe(82.1);

    const del = await request(app)
      .delete(`/api/measurements/${measurementId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const afterDelete = await request(app)
      .get(`/api/measurements?typeId=${weightTypeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(
      (afterDelete.body.data.measurements as { id: string }[]).some((m) => m.id === measurementId),
    ).toBe(false);
  });

  it('rejects unknown types, future timestamps, and out-of-range values', async () => {
    const unknownType = await request(app)
      .post('/api/measurements')
      .set('Authorization', `Bearer ${token}`)
      .send({ typeId: crypto.randomUUID(), value: 80, measuredAt: new Date().toISOString() });
    expect(unknownType.status).toBe(400);

    const future = await request(app)
      .post('/api/measurements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        typeId: weightTypeId,
        value: 80,
        measuredAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    expect(future.status).toBe(400);

    const outOfRange = await request(app)
      .post('/api/measurements')
      .set('Authorization', `Bearer ${token}`)
      .send({ typeId: weightTypeId, value: 1500, measuredAt: new Date().toISOString() });
    expect(outOfRange.status).toBe(400);
  });

  it('returns the latest value per type', async () => {
    const older = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const newer = new Date(Date.now() - 60 * 1000).toISOString();
    await request(app)
      .post('/api/measurements')
      .set('Authorization', `Bearer ${token}`)
      .send({ typeId: weightTypeId, value: 83, measuredAt: older });
    await request(app)
      .post('/api/measurements')
      .set('Authorization', `Bearer ${token}`)
      .send({ typeId: weightTypeId, value: 81.9, measuredAt: newer });

    const latest = await request(app)
      .get('/api/measurements/latest')
      .set('Authorization', `Bearer ${token}`);
    expect(latest.status).toBe(200);
    const weightEntry = (
      latest.body.data.latest as { type: { key: string }; measurement: { value: number } }[]
    ).find((entry) => entry.type.key === 'weight');
    expect(weightEntry?.measurement.value).toBe(81.9);
  });

  it('uploads, lists, serves, and soft-deletes a progress photo', async () => {
    const uploaded = await request(app)
      .post('/api/measurements/photos')
      .set('Authorization', `Bearer ${token}`)
      .field('notes', 'front pose')
      .attach('photo', PNG_BYTES, { filename: 'front.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);
    const photo = uploaded.body.data.photo as { id: string; fileUrl: string };
    expect(photo.fileUrl).toMatch(/^\/api\/uploads\/users\//);

    const list = await request(app)
      .get('/api/measurements/photos')
      .set('Authorization', `Bearer ${token}`);
    expect((list.body.data.photos as { id: string }[]).some((p) => p.id === photo.id)).toBe(true);

    const file = await request(app).get(photo.fileUrl).set('Authorization', `Bearer ${token}`);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');

    const noAuth = await request(app).get(photo.fileUrl);
    expect(noAuth.status).toBe(401);

    const foreign = await registerUser();
    const foreignFile = await request(app)
      .get(photo.fileUrl)
      .set('Authorization', `Bearer ${foreign.token}`);
    expect(foreignFile.status).toBe(404);

    const del = await request(app)
      .delete(`/api/measurements/photos/${photo.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const afterDelete = await request(app)
      .get('/api/measurements/photos')
      .set('Authorization', `Bearer ${token}`);
    expect((afterDelete.body.data.photos as { id: string }[]).some((p) => p.id === photo.id)).toBe(
      false,
    );
  });

  it('rejects non-image uploads', async () => {
    const res = await request(app)
      .post('/api/measurements/photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
  });
});
