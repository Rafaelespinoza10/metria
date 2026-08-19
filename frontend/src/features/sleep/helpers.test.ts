import {
  editedSleepInstants,
  formatMinutes,
  parseTime,
  sleepInstants,
  toTimeText,
} from './helpers';

describe('formatMinutes', () => {
  it.each([
    [454, '7h 34m'],
    [480, '8h'],
    [45, '45m'],
    [0, '0m'],
  ])('formats %s as %s', (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});

describe('parseTime', () => {
  it('parses valid 24h times and rejects invalid ones', () => {
    expect(parseTime('23:00')).toEqual({ hours: 23, minutes: 0 });
    expect(parseTime('7:34')).toEqual({ hours: 7, minutes: 34 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('noon')).toBeNull();
  });
});

describe('sleepInstants', () => {
  const now = new Date(2026, 7, 16, 10, 0);

  it('puts bedtime on yesterday when its time is after wake time', () => {
    const result = sleepInstants('23:00', '06:34', now);
    expect(result).not.toBeNull();
    expect(result?.bedtime.getDate()).toBe(15);
    expect(result?.wakeTime.getDate()).toBe(16);
    const minutes = (result!.wakeTime.getTime() - result!.bedtime.getTime()) / 60000;
    expect(minutes).toBe(454);
  });

  it('keeps bedtime today for early-morning bedtimes', () => {
    const result = sleepInstants('01:00', '08:00', now);
    expect(result?.bedtime.getDate()).toBe(16);
    const minutes = (result!.wakeTime.getTime() - result!.bedtime.getTime()) / 60000;
    expect(minutes).toBe(420);
  });

  it('returns null for invalid input', () => {
    expect(sleepInstants('25:00', '08:00', now)).toBeNull();
  });
});

describe('editedSleepInstants', () => {
  it('keeps the night anchored to the original wake-up day', () => {
    const originalWake = new Date(2026, 7, 10, 6, 30).toISOString();
    const result = editedSleepInstants(originalWake, '23:15', '07:05');
    expect(result).not.toBeNull();
    expect(result?.wakeTime.getFullYear()).toBe(2026);
    expect(result?.wakeTime.getMonth()).toBe(7);
    expect(result?.wakeTime.getDate()).toBe(10);
    expect(result?.wakeTime.getHours()).toBe(7);
    expect(result?.bedtime.getDate()).toBe(9); // bedtime after wake time-of-day → previous day
  });

  it('returns null for unparseable times', () => {
    expect(editedSleepInstants(new Date().toISOString(), 'late', '07:00')).toBeNull();
  });
});

describe('toTimeText', () => {
  it('formats an instant as local HH:MM for edit prefills', () => {
    const instant = new Date(2026, 7, 10, 6, 5).toISOString();
    expect(toTimeText(instant)).toBe('06:05');
  });
});
