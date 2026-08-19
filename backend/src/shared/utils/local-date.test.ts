import { describe, expect, it } from 'vitest';
import { endOfDayInTimezone, localDateFor, startOfDayInTimezone } from './local-date.js';

describe('startOfDayInTimezone / endOfDayInTimezone', () => {
  it('matches UTC midnight for UTC', () => {
    expect(startOfDayInTimezone('2026-08-19', 'UTC').toISOString()).toBe(
      '2026-08-19T00:00:00.000Z',
    );
    expect(endOfDayInTimezone('2026-08-19', 'UTC').toISOString()).toBe('2026-08-19T23:59:59.999Z');
  });

  it('shifts boundaries for a UTC-8 timezone', () => {
    // America/Los_Angeles is UTC-7 in August (DST).
    expect(startOfDayInTimezone('2026-08-19', 'America/Los_Angeles').toISOString()).toBe(
      '2026-08-19T07:00:00.000Z',
    );
    // …and UTC-8 in January.
    expect(startOfDayInTimezone('2026-01-19', 'America/Los_Angeles').toISOString()).toBe(
      '2026-01-19T08:00:00.000Z',
    );
  });

  it('round-trips with localDateFor at both edges of the day', () => {
    for (const timeZone of ['America/Mexico_City', 'Asia/Tokyo', 'Europe/Madrid']) {
      const start = startOfDayInTimezone('2026-08-19', timeZone);
      const end = endOfDayInTimezone('2026-08-19', timeZone);
      expect(localDateFor(start, timeZone)).toBe('2026-08-19');
      expect(localDateFor(end, timeZone)).toBe('2026-08-19');
      expect(localDateFor(new Date(start.getTime() - 1), timeZone)).toBe('2026-08-18');
      expect(localDateFor(new Date(end.getTime() + 1), timeZone)).toBe('2026-08-20');
    }
  });

  it('spans month and year boundaries', () => {
    expect(endOfDayInTimezone('2026-12-31', 'UTC').toISOString()).toBe('2026-12-31T23:59:59.999Z');
    expect(startOfDayInTimezone('2027-01-01', 'UTC').toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});
