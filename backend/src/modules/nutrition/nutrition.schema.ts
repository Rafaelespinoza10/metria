import { z } from 'zod';

const FUTURE_SKEW_MS = 5 * 60 * 1000;

export const mealCategorySchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

const eatenAtSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => new Date(value).getTime() <= Date.now() + FUTURE_SKEW_MS, {
    message: 'eatenAt cannot be in the future',
  });

const micronutrientsSchema = z
  .record(z.string().min(1).max(60), z.number().finite().nonnegative())
  .refine((value) => Object.keys(value).length <= 30, { message: 'Too many micronutrients' });

export const mealItemSchema = z.object({
  name: z.string().min(1).max(120),
  grams: z.number().nonnegative().max(5000).optional(),
  calories: z.number().nonnegative().max(5000),
  protein: z.number().nonnegative().max(1000),
  carbohydrates: z.number().nonnegative().max(1000),
  fat: z.number().nonnegative().max(1000),
  micronutrients: micronutrientsSchema.optional(),
});

export const createMealSchema = z.object({
  category: mealCategorySchema,
  name: z.string().min(1).max(120),
  eatenAt: eatenAtSchema,
  notes: z.string().max(500).optional(),
  items: z.array(mealItemSchema).min(1).max(30),
});

export const updateMealSchema = z
  .object({
    category: mealCategorySchema.optional(),
    name: z.string().min(1).max(120).optional(),
    eatenAt: eatenAtSchema.optional(),
    notes: z.string().max(500).nullable().optional(),
    items: z.array(mealItemSchema).min(1).max(30).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const dateQuerySchema = z.object({
  date: z.string().date().optional(),
});

export const putTargetsSchema = z
  .object({
    calories: z.number().nonnegative().max(10000).optional(),
    protein: z.number().nonnegative().max(1000).optional(),
    carbohydrates: z.number().nonnegative().max(1000).optional(),
    fats: z.number().nonnegative().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No targets provided' });

export type MealItemInput = z.infer<typeof mealItemSchema>;
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type PutTargetsInput = z.infer<typeof putTargetsSchema>;
