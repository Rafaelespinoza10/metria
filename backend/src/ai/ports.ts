/** AI ports return RAW, UNTRUSTED data (`unknown`). Services must validate everything
 *  with Zod before using it programmatically (Rule 9). Implementations must never
 *  diagnose, prescribe, or claim certainty (Rule 12). */

export interface MealImageInput {
  data: Buffer;
  mimeType: string;
  /** UI language for food names ('en' | 'es'). */
  locale: string;
}

export interface MealVisionPort {
  analyzeMealImage(input: MealImageInput): Promise<unknown>;
}

export interface AlternativesInput {
  mealName: string;
  items: { name: string; calories: number; protein: number; carbohydrates: number; fat: number }[];
  /** Active goal categories, e.g. ['lose_fat']. */
  goals: string[];
  locale: string;
}

export interface MealAlternativesPort {
  suggestAlternatives(input: AlternativesInput): Promise<unknown>;
}
