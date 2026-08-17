import { mondayOf } from './helpers';

describe('mondayOf', () => {
  it.each([
    ['2026-08-17', '2026-08-17'], // Monday stays
    ['2026-08-19', '2026-08-17'], // Wednesday
    ['2026-08-23', '2026-08-17'], // Sunday belongs to the prior Monday
    ['2026-09-01', '2026-08-31'], // Across month boundary (Tuesday)
  ])('%s → %s', (input, expected) => {
    expect(mondayOf(input)).toBe(expected);
  });
});
