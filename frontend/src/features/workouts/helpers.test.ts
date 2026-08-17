import { formatSet, isDraftSubmittable, totalSets } from './helpers';

describe('formatSet', () => {
  it('formats reps, weight, and rpe combinations', () => {
    expect(formatSet({ repetitions: 8, weightKg: 80, rpe: 9 })).toBe('8 × 80 kg @9');
    expect(formatSet({ repetitions: 8, weightKg: 80 })).toBe('8 × 80 kg');
    expect(formatSet({ repetitions: 12 })).toBe('12');
  });
});

describe('isDraftSubmittable', () => {
  const set = { repetitions: 8 };

  it('requires a name and at least one exercise with sets', () => {
    expect(isDraftSubmittable('', [{ name: 'Bench', sets: [set] }])).toBe(false);
    expect(isDraftSubmittable('Push day', [])).toBe(false);
    expect(isDraftSubmittable('Push day', [{ name: 'Bench', sets: [] }])).toBe(false);
    expect(isDraftSubmittable('Push day', [{ name: '  ', sets: [set] }])).toBe(false);
    expect(isDraftSubmittable('Push day', [{ name: 'Bench', sets: [set] }])).toBe(true);
  });
});

describe('totalSets', () => {
  it('counts sets across exercises', () => {
    expect(totalSets([{ sets: [1, 2] }, { sets: [1] }])).toBe(3);
    expect(totalSets([])).toBe(0);
  });
});
