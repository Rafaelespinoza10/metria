import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';

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
});
