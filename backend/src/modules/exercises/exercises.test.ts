import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { UsersRepository } from '../users/users.repository.js';
import { BODY_REGIONS, ExerciseCatalog } from './exercises.catalog.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe('ExerciseCatalog (pure)', () => {
  const catalog = new ExerciseCatalog();

  it('indexes every region with exercises and maps grouped back muscles', () => {
    const regions = new Map(catalog.regions().map((region) => [region.key, region.count]));
    for (const key of BODY_REGIONS) {
      expect(regions.get(key) ?? 0).toBeGreaterThan(0);
    }
    // lats + middle back + lower back + traps all collapse into 'back'.
    expect(regions.get('back') ?? 0).toBeGreaterThanOrEqual(100);
  });

  it('filters by level and search, capped at the limit', () => {
    const beginners = catalog.list('chest', { level: 'beginner' }, 50);
    expect(beginners.length).toBeGreaterThan(0);
    expect(beginners.every((exercise) => exercise.level === 'beginner')).toBe(true);

    const pushUps = catalog.list('chest', { search: 'push' }, 50);
    expect(pushUps.length).toBeGreaterThan(0);
    expect(pushUps.every((exercise) => exercise.name.toLowerCase().includes('push'))).toBe(true);

    expect(catalog.list('quads', {}, 5)).toHaveLength(5);
  });

  it('serves details with instructions and absolute image URLs', () => {
    const [first] = catalog.list('chest', {}, 1);
    const detail = first && catalog.findById(first.id);
    expect(detail).toBeDefined();
    expect(detail?.instructions.length).toBeGreaterThan(0);
    expect(detail?.imageUrls[0]).toMatch(/^https:\/\/raw\.githubusercontent\.com\//);
  });
});

describe.skipIf(!hasDatabase)('exercises API', () => {
  const app = createApp();
  const usersRepository = new UsersRepository();
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  async function registerUser() {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `exercises-test-${crypto.randomUUID()}@example.com`,
        password: 'password123',
        name: 'Exercises Test',
      });
    const data = (res.body as { data: { user: { id: string }; token: string } }).data;
    createdUserIds.push(data.user.id);
    return data.token;
  }

  it('requires auth and serves regions, listings, and details', async () => {
    const unauthorized = await request(app).get('/api/exercises/regions');
    expect(unauthorized.status).toBe(401);

    const token = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };

    const regions = await request(app).get('/api/exercises/regions').set(auth);
    expect(regions.status).toBe(200);
    expect((regions.body.data.regions as unknown[]).length).toBe(BODY_REGIONS.length);

    const list = await request(app).get('/api/exercises?region=chest&limit=5').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.exercises).toHaveLength(5);
    // Listings stay light: no instructions.
    expect(list.body.data.exercises[0].instructions).toBeUndefined();

    const detail = await request(app)
      .get(`/api/exercises/${list.body.data.exercises[0].id}`)
      .set(auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.exercise.instructions.length).toBeGreaterThan(0);

    const badRegion = await request(app).get('/api/exercises?region=wings').set(auth);
    expect(badRegion.status).toBe(400);

    const missing = await request(app).get('/api/exercises/not-a-real-id').set(auth);
    expect(missing.status).toBe(404);
  });
});
