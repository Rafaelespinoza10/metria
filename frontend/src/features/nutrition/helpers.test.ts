import { addDays, mealToItemsInput, sumMealItems, todayISO } from './helpers';

describe('addDays', () => {
  it('moves across month and year boundaries in calendar space', () => {
    expect(addDays('2026-08-16', -1)).toBe('2026-08-15');
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('todayISO', () => {
  it('formats a device date as YYYY-MM-DD', () => {
    expect(todayISO(new Date(2026, 7, 16, 23, 59))).toBe('2026-08-16');
    expect(todayISO(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });
});

describe('sumMealItems', () => {
  it('mirrors the backend totals math with rounding', () => {
    expect(
      sumMealItems([
        { name: 'a', calories: 297, protein: 55, carbohydrates: 0, fat: 6 },
        { name: 'b', calories: 195, protein: 4, carbohydrates: 42, fat: 0.5 },
      ]),
    ).toEqual({ calories: 492, protein: 59, carbohydrates: 42, fats: 6.5 });
  });

  it('returns zeros for no items', () => {
    expect(sumMealItems([])).toEqual({ calories: 0, protein: 0, carbohydrates: 0, fats: 0 });
  });
});

describe('mealToItemsInput', () => {
  it('strips server fields and null grams so the edit form can resubmit items', () => {
    const items = mealToItemsInput({
      items: [
        {
          id: 'i1',
          position: 0,
          name: 'Chicken',
          grams: 150,
          calories: 240,
          protein: 45,
          carbohydrates: 0,
          fat: 5,
        },
        {
          id: 'i2',
          position: 1,
          name: 'Rice',
          calories: 200,
          protein: 4,
          carbohydrates: 44,
          fat: 1,
        },
      ],
    });
    expect(items).toEqual([
      { name: 'Chicken', grams: 150, calories: 240, protein: 45, carbohydrates: 0, fat: 5 },
      { name: 'Rice', calories: 200, protein: 4, carbohydrates: 44, fat: 1 },
    ]);
  });
});
