import { ageFrom, bmiBand, bmiFrom, isValidBirthDate, isValidHeight } from './body-data';

const today = new Date('2026-08-18T12:00:00Z');

describe('ageFrom', () => {
  it('counts whole years', () => {
    expect(ageFrom('1994-05-17', today)).toBe(32);
  });

  it('does not count a birthday that has not happened yet', () => {
    expect(ageFrom('1994-12-01', today)).toBe(31);
    expect(ageFrom('1994-08-19', today)).toBe(31);
  });

  it('counts the birthday itself', () => {
    expect(ageFrom('1994-08-18', today)).toBe(32);
  });

  it('returns null without a birth date', () => {
    expect(ageFrom(null, today)).toBeNull();
    expect(ageFrom('not-a-date', today)).toBeNull();
  });
});

describe('bmiFrom', () => {
  it('computes kg per square metre', () => {
    expect(bmiFrom(78, 178)).toBe(24.6);
    expect(bmiFrom(60, 165)).toBe(22);
  });

  it('returns null when either input is missing', () => {
    expect(bmiFrom(null, 178)).toBeNull();
    expect(bmiFrom(78, null)).toBeNull();
  });
});

describe('bmiBand', () => {
  it.each([
    [17, 'under'],
    [22, 'healthy'],
    [27, 'over'],
    [33, 'obese'],
  ])('labels %s as %s', (bmi, band) => {
    expect(bmiBand(bmi as number)).toBe(band);
  });
});

describe('validation', () => {
  it.each(['1994-05-17', '1900-01-01', '2026-08-18'])('accepts %s', (value) => {
    expect(isValidBirthDate(value, today)).toBe(true);
  });

  it.each(['17/05/1994', '1994-13-01', '1899-12-31', '2026-08-19', '1994-02-30'])(
    'rejects %s',
    (value) => {
      expect(isValidBirthDate(value, today)).toBe(false);
    },
  );

  it('bounds height to a human range', () => {
    expect(isValidHeight(178)).toBe(true);
    expect(isValidHeight(40)).toBe(false);
    expect(isValidHeight(260)).toBe(false);
  });
});
