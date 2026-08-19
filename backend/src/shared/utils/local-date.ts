/** Calendar date (YYYY-MM-DD) of an instant in the given IANA timezone.
 *  'en-CA' formats as ISO. All "per day" bucketing goes through this. */
export function localDateFor(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Minutes the timezone is ahead of UTC at the given instant (DST-aware). */
function timeZoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === '24' ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** UTC instant at which the calendar day `dateISO` begins in `timeZone` —
 *  the inverse of localDateFor for day boundaries. */
export function startOfDayInTimezone(dateISO: string, timeZone: string): Date {
  const utcMidnight = new Date(`${dateISO}T00:00:00.000Z`);
  let offset = timeZoneOffsetMinutes(utcMidnight, timeZone);
  let result = new Date(utcMidnight.getTime() - offset * 60_000);
  // A DST transition between the guess and the result can shift the offset once.
  const corrected = timeZoneOffsetMinutes(result, timeZone);
  if (corrected !== offset) {
    offset = corrected;
    result = new Date(utcMidnight.getTime() - offset * 60_000);
  }
  return result;
}

/** Last UTC instant that still belongs to calendar day `dateISO` in `timeZone`. */
export function endOfDayInTimezone(dateISO: string, timeZone: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  const next = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + 1))
    .toISOString()
    .slice(0, 10);
  return new Date(startOfDayInTimezone(next, timeZone).getTime() - 1);
}
