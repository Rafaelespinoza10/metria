/** 454 → "7h 34m"; 480 → "8h"; 45 → "45m". */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Parses "HH:MM" (24 h). Returns null when invalid. */
export function parseTime(text: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** Builds bedtime/wake instants for EDITING an existing entry: times change but
 *  the night stays anchored to the entry's original wake-up day, so editing an
 *  old entry never moves it to today. */
export function editedSleepInstants(
  originalWakeTime: string,
  bedText: string,
  wakeText: string,
): { bedtime: Date; wakeTime: Date } | null {
  return sleepInstants(bedText, wakeText, new Date(originalWakeTime));
}

/** "2026-08-19T05:30:00.000Z" → "HH:MM" in device-local time, for edit prefills. */
export function toTimeText(instantISO: string): string {
  const date = new Date(instantISO);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Builds bedtime/wake instants from HH:MM strings. Wake time lands today (device
 *  clock); bedtime falls on yesterday when its time-of-day is at or after wake time. */
export function sleepInstants(
  bedText: string,
  wakeText: string,
  now: Date = new Date(),
): { bedtime: Date; wakeTime: Date } | null {
  const bed = parseTime(bedText);
  const wake = parseTime(wakeText);
  if (!bed || !wake) return null;

  const wakeTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    wake.hours,
    wake.minutes,
  );
  const bedtime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    bed.hours,
    bed.minutes,
  );
  if (bedtime.getTime() >= wakeTime.getTime()) {
    bedtime.setDate(bedtime.getDate() - 1);
  }
  return { bedtime, wakeTime };
}
