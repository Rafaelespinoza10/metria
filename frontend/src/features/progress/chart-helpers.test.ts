import {
  barRatio,
  dayInitial,
  formatCompact,
  formatMinutes,
  niceUpperBound,
  shortDate,
  trendLabels,
} from './chart-helpers';

describe('niceUpperBound', () => {
  it('snaps the max of values and target to a nice number', () => {
    expect(niceUpperBound([1800, 2100], 2000)).toBe(2500);
    expect(niceUpperBound([7200, 9800], 10000)).toBe(10000);
    expect(niceUpperBound([420, 480], 480)).toBe(500);
  });

  it('covers the target even when values are smaller', () => {
    expect(niceUpperBound([100], 2000)).toBe(2000);
  });

  it('falls back to 1 for an all-zero series', () => {
    expect(niceUpperBound([0, 0], null)).toBe(1);
    expect(niceUpperBound([], null)).toBe(1);
  });
});

describe('barRatio', () => {
  it('scales values into 0–1 and clamps overshoot', () => {
    expect(barRatio(1000, 2000)).toBe(0.5);
    expect(barRatio(3000, 2000)).toBe(1);
    expect(barRatio(0, 2000)).toBe(0);
    expect(barRatio(Number.NaN, 2000)).toBe(0);
  });
});

describe('formatting', () => {
  it('compacts large values', () => {
    expect(formatCompact(8200)).toBe('8.2k');
    expect(formatCompact(12480)).toBe('12k');
    expect(formatCompact(480)).toBe('480');
    expect(formatCompact(999)).toBe('999');
  });

  it('renders minutes as hours and minutes', () => {
    expect(formatMinutes(480)).toBe('8h');
    expect(formatMinutes(462)).toBe('7h 42m');
    expect(formatMinutes(45)).toBe('45m');
  });

  it('shortens ISO dates to day/month', () => {
    expect(shortDate('2026-08-05')).toBe('5/8');
    expect(shortDate('2026-12-31')).toBe('31/12');
  });
});

describe('trendLabels', () => {
  const week = [
    '2026-08-10', // Monday
    '2026-08-11',
    '2026-08-12',
    '2026-08-13',
    '2026-08-14',
    '2026-08-15',
    '2026-08-16', // Sunday
  ];

  it('uses weekday initials for a week', () => {
    expect(trendLabels(week, 'SMTWTFS')).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(dayInitial('2026-08-16', 'DLMXJVS')).toBe('D'); // Sunday in es
  });

  it('labels only first, middle, and last for longer windows', () => {
    const dates = Array.from({ length: 14 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
    const labels = trendLabels(dates, 'SMTWTFS');
    expect(labels[0]).toBe('1/8');
    expect(labels[6]).toBe('7/8');
    expect(labels[13]).toBe('14/8');
    expect(labels.filter((label) => label !== null)).toHaveLength(3);
  });
});
