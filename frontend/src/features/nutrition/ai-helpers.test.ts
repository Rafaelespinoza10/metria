import { aiFoodsToItems, foodConfidences } from './ai-helpers';
import type { AiFood } from './types';

const FOODS: AiFood[] = [
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
  { name: 'White rice', calories: 195, protein: 4, carbohydrates: 42, fat: 0.5, confidence: 0.7 },
];

describe('aiFoodsToItems', () => {
  it('maps foods to editable items, keeping grams only when present', () => {
    const items = aiFoodsToItems(FOODS);
    expect(items).toEqual([
      {
        name: 'Grilled chicken breast',
        grams: 180,
        calories: 297,
        protein: 55,
        carbohydrates: 0,
        fat: 6,
      },
      { name: 'White rice', calories: 195, protein: 4, carbohydrates: 42, fat: 0.5 },
    ]);
  });
});

describe('foodConfidences', () => {
  it('indexes confidences by item position', () => {
    expect(foodConfidences(FOODS)).toEqual({ 0: 0.82, 1: 0.7 });
  });
});
