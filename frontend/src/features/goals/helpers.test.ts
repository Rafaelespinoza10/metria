import { goalCategoryKey, goalMetricKey, goalMetricUnit, parseDecimal } from './helpers';

describe('parseDecimal', () => {
  it.each([
    ['82.5', 82.5],
    ['82,5', 82.5],
    ['100', 100],
    [' 7.25 ', 7.25],
  ])('parses %s as %s', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '0', '1.2.3', '82.5kg'])('rejects %s', (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});

describe('goal display helpers', () => {
  it('builds i18n keys from enum values', () => {
    expect(goalCategoryKey('lose_fat')).toBe('goals.category.lose_fat');
    expect(goalMetricKey('body_fat')).toBe('goals.metric.body_fat');
  });

  it('maps metrics to display units', () => {
    expect(goalMetricUnit('weight')).toBe('kg');
    expect(goalMetricUnit('body_fat')).toBe('%');
    expect(goalMetricUnit('protein')).toBe('g');
    expect(goalMetricUnit('steps')).toBe('');
  });
});
