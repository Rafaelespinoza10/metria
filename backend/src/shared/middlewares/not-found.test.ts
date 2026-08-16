import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';

describe('unknown routes', () => {
  it('returns the 404 error envelope', async () => {
    const res = await request(createApp()).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/does-not-exist not found',
      },
    });
  });
});
