function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Today's calendar date on the device (YYYY-MM-DD). */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Adds days to a YYYY-MM-DD date, staying in calendar space (no timezone drift). */
export function addDays(dateISO: string, delta: number): string {
  const [year = 0, month = 1, day = 1] = dateISO.split('-').map(Number);
  const date = new Date(year, month - 1, day + delta);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
