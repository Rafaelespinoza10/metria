import {
  firstExerciseImageUrl,
  formatSet,
  isDraftSubmittable,
  totalSets,
  weeklySummary,
} from './helpers';

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

describe('weeklySummary', () => {
  const today = new Date(2026, 7, 18); // 2026-08-18

  const workout = (localDate: string, durationMinutes: number | null, sets: number) => ({
    localDate,
    durationMinutes,
    exercises: [{ sets: Array.from({ length: sets }, (_, i) => i) }],
  });

  it('totals only the 7 days ending today', () => {
    const summary = weeklySummary(
      [
        workout('2026-08-18', 60, 10),
        workout('2026-08-12', 45, 8), // exactly 6 days back — included
        workout('2026-08-11', 90, 12), // 7 days back — excluded
      ],
      today,
    );
    expect(summary).toEqual({ workouts: 2, sets: 18, minutes: 105 });
  });

  it('treats missing durations as zero minutes', () => {
    expect(weeklySummary([workout('2026-08-18', null, 5)], today)).toEqual({
      workouts: 1,
      sets: 5,
      minutes: 0,
    });
  });

  it('returns zeros for an empty history', () => {
    expect(weeklySummary([], today)).toEqual({ workouts: 0, sets: 0, minutes: 0 });
  });
});

describe('firstExerciseImageUrl', () => {
  it('returns the first exercise photo, skipping photo-less exercises', () => {
    expect(
      firstExerciseImageUrl({
        exercises: [{ imageUrl: null }, { imageUrl: '/api/uploads/a.jpg' }],
      }),
    ).toBe('/api/uploads/a.jpg');
    expect(firstExerciseImageUrl({ exercises: [{ imageUrl: null }] })).toBeNull();
    expect(firstExerciseImageUrl({ exercises: [] })).toBeNull();
  });
});
