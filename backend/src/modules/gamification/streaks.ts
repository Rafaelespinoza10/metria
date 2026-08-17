import { addDaysISO } from '../../shared/utils/date-range.js';

/** Consecutive-day run ending today (or yesterday when today has no entry yet). Pure. */
export function currentStreak(datesWithData: Set<string>, today: string): number {
  let cursor = datesWithData.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (datesWithData.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}
