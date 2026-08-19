import { filledSegments } from './SegmentedArc';

describe('filledSegments', () => {
  it('maps 0–1 ratios onto whole segments', () => {
    expect(filledSegments(0, 9)).toBe(0);
    expect(filledSegments(0.5, 10)).toBe(5);
    expect(filledSegments(0.62, 9)).toBe(5); // floor(5.58)
    expect(filledSegments(1, 9)).toBe(9);
  });

  it('clamps overshoot and rejects invalid input', () => {
    expect(filledSegments(1.4, 9)).toBe(9);
    expect(filledSegments(-0.2, 9)).toBe(0);
    expect(filledSegments(Number.NaN, 9)).toBe(0);
  });
});
