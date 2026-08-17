import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import { UsersRepository } from '../users/users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const TIMEZONE = 'America/Mexico_City'; // UTC-6

const app = createApp();
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `nutrition-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'Nutrition Test',
      timezone: TIMEZONE,
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

const CHICKEN_ITEM = {
  name: 'Grilled chicken breast',
  grams: 180,
  calories: 297,
  protein: 55,
  carbohydrates: 0,
  fat: 6,
};
const RICE_ITEM = {
  name: 'White rice',
  grams: 150,
  calories: 195,
  protein: 4,
  carbohydrates: 42,
  fat: 0.5,
  micronutrients: { fiber_g: 0.6, sodium_mg: 1 },
};

describe.skipIf(!hasDatabase)('nutrition', () => {
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

  it('creates a meal with items and computes totals', async () => {
    const res = await request(app)
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'lunch',
        name: 'Chicken and rice',
        eatenAt: new Date().toISOString(),
        items: [CHICKEN_ITEM, RICE_ITEM],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.meal.items).toHaveLength(2);
    expect(res.body.data.meal.totals).toEqual({
      calories: 492,
      protein: 59,
      carbohydrates: 42,
      fats: 6.5,
    });
  });

  it('buckets meals into the user-local day, not the UTC day', async () => {
    // 02:00 UTC = 20:00 the previous day in UTC-6.
    const now = new Date();
    const utcEarly = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0),
    );
    const eatenAt = utcEarly > now ? new Date(utcEarly.getTime() - 24 * 60 * 60 * 1000) : utcEarly;
    const expectedLocalDate = localDateFor(eatenAt, TIMEZONE);
    const utcDate = eatenAt.toISOString().slice(0, 10);
    expect(expectedLocalDate).not.toBe(utcDate);

    const created = await request(app)
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'dinner',
        name: 'Late dinner',
        eatenAt: eatenAt.toISOString(),
        items: [CHICKEN_ITEM],
      });
    expect(created.status).toBe(201);
    expect(created.body.data.meal.localDate).toBe(expectedLocalDate);

    const localDay = await request(app)
      .get(`/api/nutrition/meals?date=${expectedLocalDate}`)
      .set('Authorization', `Bearer ${token}`);
    const names = (localDay.body.data.meals as { name: string }[]).map((meal) => meal.name);
    expect(names).toContain('Late dinner');

    const wrongDay = await request(app)
      .get(`/api/nutrition/meals?date=${utcDate}`)
      .set('Authorization', `Bearer ${token}`);
    const wrongNames = (wrongDay.body.data.meals as { name: string }[]).map((meal) => meal.name);
    expect(wrongNames).not.toContain('Late dinner');
  });

  it('update replaces items and totals follow', async () => {
    const created = await request(app)
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'breakfast',
        name: 'Eggs',
        eatenAt: new Date().toISOString(),
        items: [CHICKEN_ITEM, RICE_ITEM],
      });
    const mealId = created.body.data.meal.id as string;

    const updated = await request(app)
      .patch(`/api/nutrition/meals/${mealId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ name: 'Scrambled eggs', calories: 210, protein: 14, carbohydrates: 2, fat: 15 }],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.meal.items).toHaveLength(1);
    expect(updated.body.data.meal.totals.calories).toBe(210);
  });

  it('rejects meals without items and negative macros', async () => {
    const noItems = await request(app)
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'snack',
        name: 'Empty',
        eatenAt: new Date().toISOString(),
        items: [],
      });
    expect(noItems.status).toBe(400);

    const negative = await request(app)
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'snack',
        name: 'Bad',
        eatenAt: new Date().toISOString(),
        items: [{ name: 'x', calories: -10, protein: 0, carbohydrates: 0, fat: 0 }],
      });
    expect(negative.status).toBe(400);
  });

  it('upserts daily targets and reports the day summary against them', async () => {
    const put = await request(app)
      .put('/api/nutrition/targets')
      .set('Authorization', `Bearer ${token}`)
      .send({ calories: 2200, protein: 170, carbohydrates: 220, fats: 70 });
    expect(put.status).toBe(200);
    expect(put.body.data.targets.calories).toBe(2200);

    // Same-day overwrite.
    const overwrite = await request(app)
      .put('/api/nutrition/targets')
      .set('Authorization', `Bearer ${token}`)
      .send({ protein: 160 });
    expect(overwrite.body.data.targets.protein).toBe(160);
    expect(overwrite.body.data.targets.calories).toBe(2200);

    const fresh = await registerUser();
    await request(app)
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${fresh.token}`)
      .send({
        category: 'lunch',
        name: 'Chicken',
        eatenAt: new Date().toISOString(),
        items: [CHICKEN_ITEM],
      });
    await request(app)
      .put('/api/nutrition/targets')
      .set('Authorization', `Bearer ${fresh.token}`)
      .send({ calories: 2000, protein: 150 });

    const summary = await request(app)
      .get('/api/nutrition/summary')
      .set('Authorization', `Bearer ${fresh.token}`);
    expect(summary.status).toBe(200);
    expect(summary.body.data.totals.calories).toBe(297);
    expect(summary.body.data.totals.protein).toBe(55);
    expect(summary.body.data.targets).toEqual({ calories: 2000, protein: 150 });
  });

  it('answers 404 for foreign meals', async () => {
    const created = await request(app)
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'snack',
        name: 'Mine',
        eatenAt: new Date().toISOString(),
        items: [CHICKEN_ITEM],
      });
    const mealId = created.body.data.meal.id as string;

    const foreign = await registerUser();
    const res = await request(app)
      .get(`/api/nutrition/meals/${mealId}`)
      .set('Authorization', `Bearer ${foreign.token}`);
    expect(res.status).toBe(404);
  });
});
