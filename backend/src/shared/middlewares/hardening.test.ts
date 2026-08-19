import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { env, assertProductionSafe, type Env } from '../../config/env.js';
import { ConsolePasswordResetMailer } from '../../modules/auth/mailer.js';
import { TokenService } from '../../modules/auth/token.service.js';
import { UsersRepository } from '../../modules/users/users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d4944415478da63fcffff3f0300050201f4d3e1f000' +
    '00000049454e44ae426082',
  'hex',
);

// No DB needed: health and rate-limit rejection paths never touch repositories.
describe('hardening', () => {
  it('sets security headers on every response', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('answers CORS preflight with the configured origin policy', async () => {
    const res = await request(createApp())
      .options('/api/health')
      .set('Origin', 'https://example.com')
      .set('Access-Control-Request-Method', 'GET');

    // origin: true reflects the request origin (equivalent to allow-all for the API).
    expect(res.headers['access-control-allow-origin']).toBe('https://example.com');
  });

  it('rate limits auth endpoints with the envelope 429', async () => {
    const app = createApp({ authRateLimit: { windowMs: 60_000, limit: 3 } });

    let lastStatus = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password' });
      lastStatus = res.status;
      if (res.status === 429) {
        expect(res.body).toEqual({
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
        });
      }
    }
    expect(lastStatus).toBe(429);
  });

  it('rate limits the whole API globally, but never the health check', async () => {
    const app = createApp({ globalRateLimit: { windowMs: 60_000, limit: 3 } });

    let lastStatus = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const res = await request(app).get('/api/goals');
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);

    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
  });
});

describe('production env guards', () => {
  const base: Env = {
    ...env,
    NODE_ENV: 'production',
    JWT_SECRET: 'a-real-secret-that-is-long-enough-1234567890',
    DATABASE_URL: 'postgres://user:pass@db:5432/metria',
    CORS_ORIGIN: 'https://app.metria.example',
  };

  it('accepts a fully configured production env', () => {
    expect(() => assertProductionSafe(base)).not.toThrow();
  });

  it('rejects wildcard CORS, missing DATABASE_URL, and the dev JWT secret', () => {
    expect(() => assertProductionSafe({ ...base, CORS_ORIGIN: '*' })).toThrow(/CORS_ORIGIN/);
    expect(() => assertProductionSafe({ ...base, DATABASE_URL: undefined })).toThrow(
      /DATABASE_URL/,
    );
    expect(() =>
      assertProductionSafe({
        ...base,
        JWT_SECRET: 'metria-dev-secret-change-me-in-production-0123456789',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('ignores dev defaults outside production', () => {
    expect(() =>
      assertProductionSafe({ ...base, NODE_ENV: 'development', CORS_ORIGIN: '*' }),
    ).not.toThrow();
  });
});

describe('token pinning', () => {
  const tokens = new TokenService();

  it('round-trips its own tokens', () => {
    const token = tokens.sign({ sub: 'user-1', tv: 3 });
    expect(tokens.verify(token)).toEqual({ sub: 'user-1', tv: 3 });
  });

  it('rejects tokens minted without the pinned issuer/audience', () => {
    const legacy = jwt.sign({ sub: 'user-1', tv: 3 }, env.JWT_SECRET, { expiresIn: 3600 });
    expect(tokens.verify(legacy)).toBeNull();
  });
});

describe('console mailer production guard', () => {
  it('refuses to construct in production and works elsewhere', () => {
    expect(() => new ConsolePasswordResetMailer('production')).toThrow(/production/);
    expect(() => new ConsolePasswordResetMailer('development')).not.toThrow();
  });
});

describe.skipIf(!hasDatabase)('upload hardening (DB)', () => {
  const usersRepository = new UsersRepository();
  const createdUserIds: string[] = [];
  let token: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    app = createApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `hardening-test-${crypto.randomUUID()}@example.com`,
        password: 'password123',
        name: 'Hardening Test',
      });
    const data = (res.body as { data: { user: { id: string }; token: string } }).data;
    createdUserIds.push(data.user.id);
    token = data.token;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('rejects a spoofed MIME type by sniffing magic bytes', async () => {
    const res = await request(app)
      .post('/api/workouts/exercise-photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', Buffer.from('<script>alert(1)</script>'), {
        filename: 'sneaky.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps an oversized upload to an envelope 413, not a 500', async () => {
    const oversized = Buffer.concat([PNG_BYTES, Buffer.alloc(10 * 1024 * 1024 + 1)]);
    const res = await request(app)
      .post('/api/workouts/exercise-photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', oversized, { filename: 'huge.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('serves uploads as attachments with nosniff', async () => {
    const uploaded = await request(app)
      .post('/api/workouts/exercise-photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', PNG_BYTES, { filename: 'ok.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);

    const served = await request(app)
      .get(uploaded.body.data.photo.imageUrl as string)
      .set('Authorization', `Bearer ${token}`);
    expect(served.status).toBe(200);
    expect(served.headers['content-disposition']).toBe('attachment');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });

  it('enforces the per-user AI quota with 429', async () => {
    const limitedApp = createApp({ aiRateLimit: { windowMs: 60_000, limit: 2 } });
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await request(limitedApp)
        .get('/api/insights/daily')
        .set('Authorization', `Bearer ${token}`);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
