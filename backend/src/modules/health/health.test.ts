import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { UnconfiguredPasswordResetMailer } from '../auth/mailer.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe('health', () => {
  it('liveness answers without touching the database', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'ok' });
  });
});

describe.skipIf(!hasDatabase)('readiness (DB)', () => {
  afterAll(async () => {
    await closeDb();
  });

  it('reports db: ok when Postgres answers', async () => {
    const res = await request(createApp()).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ db: 'ok' });
  });
});

describe('unconfigured mailer', () => {
  it('rejects with an envelope-friendly 503 instead of leaking tokens to logs', async () => {
    await expect(new UnconfiguredPasswordResetMailer().sendPasswordReset()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
  });
});
