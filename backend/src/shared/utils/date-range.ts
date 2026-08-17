/** Adds days to a YYYY-MM-DD date in calendar space (UTC-based, no timezone drift). */
export function addDaysISO(dateISO: string, delta: number): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing the given date. */
export function mondayOf(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  const weekday = date.getUTCDay(); // 0 = Sunday
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDaysISO(dateISO, offset);
}

export function isMonday(dateISO: string): boolean {
  return new Date(`${dateISO}T00:00:00.000Z`).getUTCDay() === 1;
}
