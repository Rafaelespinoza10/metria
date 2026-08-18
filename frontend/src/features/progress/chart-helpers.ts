/** Chart scaling and label math for the Home trend chart — pure and unit-tested. */

/** Smallest "nice" number (1/1.5/2/2.5/3/4/5/6/8 × 10^n) ≥ every value and the target. */
export function niceUpperBound(values: number[], target: number | null): number {
  const max = Math.max(0, ...values.filter(Number.isFinite), target ?? 0);
  if (max <= 0) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(max)));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) {
    if (max <= step * base) return step * base;
  }
  return 10 * base;
}

/** 0–1 share of the chart height a value fills. */
export function barRatio(value: number, bound: number): number {
  if (!Number.isFinite(value) || value <= 0 || bound <= 0) return 0;
  return Math.min(value / bound, 1);
}

/** 8200 → "8.2k", 12480 → "12k", 480 → "480". */
export function formatCompact(value: number): string {
  if (value >= 10000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return `${Math.round(value)}`;
}

/** 480 → "8h", 462 → "7h 42m", 45 → "45m". */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * Weekday initial for an ISO date from a 7-letter string starting on Sunday
 * (en "SMTWTFS", es "DLMXJVS").
 */
export function dayInitial(dateISO: string, initials: string): string {
  const weekday = new Date(`${dateISO}T00:00:00.000Z`).getUTCDay();
  return initials[weekday] ?? '';
}

/**
 * X-axis labels for a series: every weekday initial when a week fits,
 * first/middle/last dates otherwise (a label per bar would collide).
 */
export function trendLabels(dates: string[], initials: string): (string | null)[] {
  if (dates.length <= 7) return dates.map((date) => dayInitial(date, initials));
  const middle = Math.floor((dates.length - 1) / 2);
  return dates.map((date, index) =>
    index === 0 || index === middle || index === dates.length - 1 ? shortDate(date) : null,
  );
}

/** "2026-08-18" → "18/8" (day/month, unambiguous within a 30-day window). */
export function shortDate(dateISO: string): string {
  const [, month, day] = dateISO.split('-');
  return `${Number(day)}/${Number(month)}`;
}
