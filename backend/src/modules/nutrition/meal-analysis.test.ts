import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MealAlternativesPort, MealVisionPort } from '../../ai/ports.js';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { LocalStorageService } from '../../shared/storage/local-storage.service.js';
import { UsersRepository } from '../users/users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

// OpenAI is NEVER called from tests: both ports are controllable fakes.
class FakeVision implements MealVisionPort {
  nextResult: unknown = null;
  shouldThrow = false;

  analyzeMealImage(): Promise<unknown> {
    if (this.shouldThrow) return Promise.reject(new Error('upstream down'));
    return Promise.resolve(this.nextResult);
  }
}

class FakeAlternatives implements MealAlternativesPort {
  nextResult: unknown = null;
  lastInput: unknown = null;

  suggestAlternatives(input: unknown): Promise<unknown> {
    this.lastInput = input;
    return Promise.resolve(this.nextResult);
  }
}

const VALID_AI_RESULT = {
  foods: [
    {
      name: 'Grilled chicken breast',
      estimatedGrams: 180,
      calories: 297,
      protein: 55,
      carbohydrates: 0,
      fat: 6,
      micronutrients: { sodium_mg: 120 },
      confidence: 0.82,
    },
    {
      name: 'White rice',
      estimatedGrams: 150,
      calories: 195,
      protein: 4,
      carbohydrates: 42,
      fat: 0.5,
      micronutrients: null,
      confidence: 0.7,
    },
  ],
  overallConfidence: 0.75,
  notes: null,
};

const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d4944415478da63fcffff3f0300050201f4d3e1f000' +
    '00000049454e44ae426082',
  'hex',
);

const storageDir = mkdtempSync(path.join(tmpdir(), 'metria-ai-'));
const vision = new FakeVision();
const alternatives = new FakeAlternatives();
const app = createApp({
  storage: new LocalStorageService(storageDir),
  mealVision: vision,
  mealAlternatives: alternatives,
});
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `ai-test-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      name: 'AI Test',
    });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { token: data.token, id: data.user.id };
}

async function analyzePhoto(token: string) {
  return request(app)
    .post('/api/nutrition/analyses')
    .set('Authorization', `Bearer ${token}`)
    .attach('photo', PNG_BYTES, { filename: 'meal.png', contentType: 'image/png' });
}

describe.skipIf(!hasDatabase)('AI meal analysis', () => {
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

  it('analyzes a photo into a completed, normalized draft — and creates no meal', async () => {
    vision.shouldThrow = false;
    vision.nextResult = VALID_AI_RESULT;

    const res = await analyzePhoto(token);
    expect(res.status).toBe(201);
    const analysis = res.body.data.analysis;
    expect(analysis.status).toBe('completed');
    expect(analysis.result.foods).toHaveLength(2);
    expect(analysis.result.foods[0].confidence).toBe(0.82);
    // Nulls stripped during normalization.
    expect(analysis.result.foods[1].micronutrients).toBeUndefined();
    expect(analysis.result.notes).toBeUndefined();

    const meals = await request(app)
      .get('/api/nutrition/meals')
      .set('Authorization', `Bearer ${token}`);
    expect(
      (meals.body.data.meals as { analysisId: string | null }[]).some(
        (meal) => meal.analysisId === analysis.id,
      ),
    ).toBe(false);
  });

  it('stores a failed draft when the vision port throws', async () => {
    vision.shouldThrow = true;
    const res = await analyzePhoto(token);
    expect(res.status).toBe(201);
    expect(res.body.data.analysis.status).toBe('failed');
    expect(res.body.data.analysis.errorCode).toBe('ai_unavailable');
    vision.shouldThrow = false;
  });

  it('rejects invalid AI payloads entirely (never partially trusted)', async () => {
    vision.nextResult = {
      foods: [
        { name: 'Mystery', calories: -50, protein: 0, carbohydrates: 0, fat: 0, confidence: 2 },
      ],
    };
    const res = await analyzePhoto(token);
    expect(res.body.data.analysis.status).toBe('failed');
    expect(res.body.data.analysis.errorCode).toBe('ai_invalid_response');
    vision.nextResult = VALID_AI_RESULT;
  });

  it('confirm persists exactly the user-edited payload and locks the analysis', async () => {
    vision.nextResult = VALID_AI_RESULT;
    const analyzed = await analyzePhoto(token);
    const analysisId = analyzed.body.data.analysis.id as string;

    // The user corrected the AI estimate (removed rice, adjusted calories).
    const editedMeal = {
      category: 'lunch',
      name: 'Grilled chicken',
      eatenAt: new Date().toISOString(),
      items: [
        {
          name: 'Grilled chicken breast',
          grams: 200,
          calories: 330,
          protein: 60,
          carbohydrates: 0,
          fat: 7,
        },
      ],
    };
    const confirmed = await request(app)
      .post(`/api/nutrition/analyses/${analysisId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send(editedMeal);

    expect(confirmed.status).toBe(201);
    expect(confirmed.body.data.meal.source).toBe('ai_confirmed');
    expect(confirmed.body.data.meal.analysisId).toBe(analysisId);
    expect(confirmed.body.data.meal.items).toHaveLength(1);
    expect(confirmed.body.data.meal.totals.calories).toBe(330);

    const draft = await request(app)
      .get(`/api/nutrition/analyses/${analysisId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(draft.body.data.analysis.status).toBe('confirmed');

    const again = await request(app)
      .post(`/api/nutrition/analyses/${analysisId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send(editedMeal);
    expect(again.status).toBe(409);
  });

  it('discard marks the draft and blocks confirmation', async () => {
    vision.nextResult = VALID_AI_RESULT;
    const analyzed = await analyzePhoto(token);
    const analysisId = analyzed.body.data.analysis.id as string;

    const discarded = await request(app)
      .post(`/api/nutrition/analyses/${analysisId}/discard`)
      .set('Authorization', `Bearer ${token}`);
    expect(discarded.status).toBe(200);
    expect(discarded.body.data.analysis.status).toBe('discarded');

    const confirm = await request(app)
      .post(`/api/nutrition/analyses/${analysisId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'snack',
        name: 'x',
        eatenAt: new Date().toISOString(),
        items: [{ name: 'x', calories: 1, protein: 0, carbohydrates: 0, fat: 0 }],
      });
    expect(confirm.status).toBe(409);
  });

  it('answers 404 for foreign analyses', async () => {
    vision.nextResult = VALID_AI_RESULT;
    const analyzed = await analyzePhoto(token);
    const analysisId = analyzed.body.data.analysis.id as string;

    const foreign = await registerUser();
    const res = await request(app)
      .get(`/api/nutrition/analyses/${analysisId}`)
      .set('Authorization', `Bearer ${foreign.token}`);
    expect(res.status).toBe(404);
  });

  it('returns validated alternatives including active goals in the port input', async () => {
    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'lose_fat', metric: 'weight', targetValue: 78 });
    const meal = await request(app)
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'dinner',
        name: 'Pizza',
        eatenAt: new Date().toISOString(),
        items: [{ name: 'Pizza slice', calories: 285, protein: 12, carbohydrates: 36, fat: 10 }],
      });
    const mealId = meal.body.data.meal.id as string;

    alternatives.nextResult = {
      suggestions: [
        { title: 'Thin-crust with extra veggies', description: 'Cuts roughly a third of the fat.' },
      ],
    };
    const res = await request(app)
      .post(`/api/nutrition/meals/${mealId}/alternatives`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.suggestions).toHaveLength(1);
    expect((alternatives.lastInput as { goals: string[] }).goals).toContain('lose_fat');

    alternatives.nextResult = { nonsense: true };
    const invalid = await request(app)
      .post(`/api/nutrition/meals/${mealId}/alternatives`)
      .set('Authorization', `Bearer ${token}`);
    expect(invalid.status).toBe(503);
    expect(invalid.body.error.code).toBe('AI_UNAVAILABLE');
  });
});
