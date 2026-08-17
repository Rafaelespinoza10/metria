import { z } from 'zod';

/** Validates RAW AI output. Anything outside these bounds fails the whole analysis —
 *  AI data is never partially trusted (Rule 9). */
export const aiMealResultSchema = z.object({
  foods: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        estimatedGrams: z.number().nonnegative().max(5000).nullish(),
        calories: z.number().nonnegative().max(5000),
        protein: z.number().nonnegative().max(1000),
        carbohydrates: z.number().nonnegative().max(1000),
        fat: z.number().nonnegative().max(1000),
        micronutrients: z
          .record(z.string().min(1).max(60), z.number().finite().nonnegative())
          .nullish(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .min(1)
    .max(30),
  overallConfidence: z.number().min(0).max(1).nullish(),
  notes: z.string().max(500).nullish(),
});

export const aiAlternativesSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(6),
});

export type AiMealResult = z.infer<typeof aiMealResultSchema>;

/** Stored (normalized) estimation: nulls stripped so jsonb stays clean. */
export interface MealEstimation {
  foods: {
    name: string;
    estimatedGrams?: number;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    micronutrients?: Record<string, number>;
    confidence: number;
  }[];
  overallConfidence?: number;
  notes?: string;
}

export function normalizeAiResult(raw: AiMealResult): MealEstimation {
  return {
    foods: raw.foods.map((food) => ({
      name: food.name,
      ...(food.estimatedGrams != null ? { estimatedGrams: food.estimatedGrams } : {}),
      calories: food.calories,
      protein: food.protein,
      carbohydrates: food.carbohydrates,
      fat: food.fat,
      ...(food.micronutrients != null ? { micronutrients: food.micronutrients } : {}),
      confidence: food.confidence,
    })),
    ...(raw.overallConfidence != null ? { overallConfidence: raw.overallConfidence } : {}),
    ...(raw.notes != null ? { notes: raw.notes } : {}),
  };
}
