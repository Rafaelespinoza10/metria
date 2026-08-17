import type { MacroTotals, MealItemInput } from './types';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Today's calendar date on the device (YYYY-MM-DD). */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Adds days to a YYYY-MM-DD date, staying in calendar space (no timezone drift). */
export function addDays(dateISO: string, delta: number): string {
  const [year = 0, month = 1, day = 1] = dateISO.split('-').map(Number);
  const date = new Date(year, month - 1, day + delta);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Mirrors the backend totals math for live form previews. */
export function sumMealItems(items: MealItemInput[]): MacroTotals {
  return {
    calories: round1(items.reduce((sum, item) => sum + item.calories, 0)),
    protein: round1(items.reduce((sum, item) => sum + item.protein, 0)),
    carbohydrates: round1(items.reduce((sum, item) => sum + item.carbohydrates, 0)),
    fats: round1(items.reduce((sum, item) => sum + item.fat, 0)),
  };
}
