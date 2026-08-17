import { formatDelta, isImprovement } from './helpers';

describe('formatDelta', () => {
  it('signs positive and negative deltas and hides zero/null', () => {
    expect(formatDelta(6)).toBe('+6');
    expect(formatDelta(-1.4, 'kg')).toBe('-1.4 kg');
    expect(formatDelta(2.1, 'cm')).toBe('+2.1 cm');
    expect(formatDelta(0)).toBeNull();
    expect(formatDelta(null)).toBeNull();
  });
});

describe('isImprovement', () => {
  it('treats downward body deltas as improvement', () => {
    expect(isImprovement(-1.4)).toBe(true);
    expect(isImprovement(0.5)).toBe(false);
    expect(isImprovement(null)).toBe(false);
  });
});
