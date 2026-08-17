import { addDays } from '../../services/dates';

/** Monday of the week containing the given YYYY-MM-DD date (calendar space). */
export function mondayOf(dateISO: string): string {
  const [year = 0, month = 1, day = 1] = dateISO.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay(); // 0 = Sunday
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(dateISO, offset);
}
