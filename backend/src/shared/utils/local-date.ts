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
