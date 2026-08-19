/** Body-data math shown on the profile. Data only — never a medical judgment. */

/** Whole years between an ISO birth date and `today` (defaults to now). */
export function ageFrom(birthDate: string | null, today: Date = new Date()): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}

/** kg / m², rounded to one decimal. */
export function bmiFrom(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const meters = heightCm / 100;
  const value = weightKg / (meters * meters);
  if (!Number.isFinite(value) || value <= 0 || value > 100) return null;
  return Math.round(value * 10) / 10;
}

export type BmiBand = 'under' | 'healthy' | 'over' | 'obese';

/** WHO adult bands, used only to label the number the user already sees. */
export function bmiBand(bmi: number): BmiBand {
  if (bmi < 18.5) return 'under';
  if (bmi < 25) return 'healthy';
  if (bmi < 30) return 'over';
  return 'obese';
}

/** Accepts "1994-05-17" and rejects anything the API would reject anyway. */
export function isValidBirthDate(value: string, today: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== value) return false;
  return value >= '1900-01-01' && value <= today.toISOString().slice(0, 10);
}

export function isValidHeight(heightCm: number): boolean {
  return heightCm >= 50 && heightCm <= 250;
}
