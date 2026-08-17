import { env } from '../../config/env.js';
import type { MealAlternativesPort, MealVisionPort } from '../../ai/ports.js';
import { AppError } from '../../shared/errors/app-error.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type { StoragePort } from '../../shared/storage/storage.port.js';
import type { GoalsRepository } from '../goals/goals.repository.js';
import type { UsersRepository } from '../users/users.repository.js';
import { aiAlternativesSchema, aiMealResultSchema, normalizeAiResult } from './ai-result.schema.js';
import type { MealAnalysisRepository, MealAnalysisRow } from './meal-analysis.repository.js';
import type { CreateMealInput } from './nutrition.schema.js';
import type { NutritionRepository } from './nutrition.repository.js';
import { mealTotals, type MealResponse } from './nutrition.service.js';

const PHOTO_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
}

export interface AlternativeSuggestion {
  title: string;
  description: string;
}

export class MealAnalysisService {
  constructor(
    private readonly analysisRepository: MealAnalysisRepository,
    private readonly nutritionRepository: NutritionRepository,
    private readonly goalsRepository: GoalsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly storage: StoragePort,
    private readonly vision: MealVisionPort,
    private readonly alternatives: MealAlternativesPort,
  ) {}

  private async userInfo(userId: string): Promise<{ timezone: string; locale: string }> {
    const user = await this.usersRepository.findById(userId);
    return { timezone: user?.timezone ?? 'UTC', locale: user?.locale ?? 'en' };
  }

  /** Photo → stored image → AI draft. NEVER creates a meal (Rule 10). */
  async analyze(userId: string, file: UploadedImage): Promise<MealAnalysisRow> {
    const extension = PHOTO_CONTENT_TYPES[file.mimetype];
    if (!extension) throw AppError.validation('Only JPEG, PNG, or WebP images are allowed');

    const stored = await this.storage.save({
      userId,
      folder: 'meals',
      extension,
      contentType: file.mimetype,
      data: file.buffer,
    });
    const analysis = await this.analysisRepository.create(userId, stored.key);
    const { locale } = await this.userInfo(userId);

    let raw: unknown;
    try {
      raw = await this.vision.analyzeMealImage({
        data: file.buffer,
        mimeType: file.mimetype,
        locale,
      });
    } catch {
      return (
        (await this.analysisRepository.setResult(analysis.id, {
          status: 'failed',
          errorCode: 'ai_unavailable',
        })) ?? analysis
      );
    }

    const parsed = aiMealResultSchema.safeParse(raw);
    if (!parsed.success) {
      return (
        (await this.analysisRepository.setResult(analysis.id, {
          status: 'failed',
          errorCode: 'ai_invalid_response',
        })) ?? analysis
      );
    }
    return (
      (await this.analysisRepository.setResult(analysis.id, {
        status: 'completed',
        model: env.OPENAI_MODEL,
        result: normalizeAiResult(parsed.data),
      })) ?? analysis
    );
  }

  async getById(userId: string, id: string): Promise<MealAnalysisRow> {
    const analysis = await this.analysisRepository.findByIdForUser(id, userId);
    if (!analysis) throw AppError.notFound('Analysis not found');
    return analysis;
  }

  /** Persists the USER-REVIEWED payload — the raw AI result is never copied here. */
  async confirm(userId: string, id: string, input: CreateMealInput): Promise<MealResponse> {
    const analysis = await this.getById(userId, id);
    if (analysis.status === 'confirmed' || analysis.status === 'discarded') {
      throw AppError.conflict(`Analysis is already ${analysis.status}`);
    }

    const eatenAt = new Date(input.eatenAt);
    const { timezone } = await this.userInfo(userId);
    const meal = await this.nutritionRepository.createMeal({
      userId,
      category: input.category,
      name: input.name,
      eatenAt,
      localDate: localDateFor(eatenAt, timezone),
      notes: input.notes,
      items: input.items,
      source: 'ai_confirmed',
      analysisId: analysis.id,
    });
    await this.analysisRepository.setStatus(analysis.id, 'confirmed');
    return { ...meal, totals: mealTotals(meal) };
  }

  async discard(userId: string, id: string): Promise<MealAnalysisRow> {
    const analysis = await this.getById(userId, id);
    if (analysis.status === 'confirmed') {
      throw AppError.conflict('Analysis is already confirmed');
    }
    await this.analysisRepository.setStatus(analysis.id, 'discarded');
    return { ...analysis, status: 'discarded' };
  }

  async suggestAlternatives(userId: string, mealId: string): Promise<AlternativeSuggestion[]> {
    const meal = await this.nutritionRepository.findByIdForUser(mealId, userId);
    if (!meal) throw AppError.notFound('Meal not found');

    const [{ locale }, activeGoals] = await Promise.all([
      this.userInfo(userId),
      this.goalsRepository.listByUser(userId, 'active'),
    ]);

    const raw = await this.alternatives.suggestAlternatives({
      mealName: meal.name,
      items: meal.items.map((item) => ({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbohydrates: item.carbohydrates,
        fat: item.fat,
      })),
      goals: [...new Set(activeGoals.map((goal) => goal.category))],
      locale,
    });

    const parsed = aiAlternativesSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError('AI_UNAVAILABLE', 'AI returned an unusable response', 503);
    }
    return parsed.data.suggestions;
  }
}
