import { closeDb, getDb } from './client.js';
import { badges } from './schema/gamification.js';
import { measurementTypes } from './schema/measurements.js';

const SYSTEM_MEASUREMENT_TYPES: { key: string; unit: 'kg' | 'cm' | '%' }[] = [
  { key: 'weight', unit: 'kg' },
  { key: 'body_fat', unit: '%' },
  { key: 'neck', unit: 'cm' },
  { key: 'shoulders', unit: 'cm' },
  { key: 'chest', unit: 'cm' },
  { key: 'waist', unit: 'cm' },
  { key: 'hips', unit: 'cm' },
  { key: 'left_biceps', unit: 'cm' },
  { key: 'right_biceps', unit: 'cm' },
  { key: 'left_triceps', unit: 'cm' },
  { key: 'right_triceps', unit: 'cm' },
  { key: 'left_forearm', unit: 'cm' },
  { key: 'right_forearm', unit: 'cm' },
  { key: 'left_thigh', unit: 'cm' },
  { key: 'right_thigh', unit: 'cm' },
  { key: 'left_calf', unit: 'cm' },
  { key: 'right_calf', unit: 'cm' },
];

const BADGE_KEYS = [
  'tracking_7_days',
  'tracking_30_days',
  'sleep_goal_7_consecutive',
  'workouts_10',
  'steps_100k_total',
  'first_measurement_improvement',
];

export async function seed(): Promise<void> {
  const db = getDb();

  await db
    .insert(measurementTypes)
    .values(SYSTEM_MEASUREMENT_TYPES.map(({ key, unit }) => ({ key, unit, userId: null })))
    .onConflictDoNothing();

  await db
    .insert(badges)
    .values(BADGE_KEYS.map((key) => ({ key })))
    .onConflictDoNothing();
}

const isDirectRun = process.argv[1]?.endsWith('/seed.ts') ?? false;
if (isDirectRun) {
  seed()
    .then(async () => {
      console.log('Seed completed.');
      await closeDb();
    })
    .catch(async (error: unknown) => {
      console.error('Seed failed:', error);
      await closeDb();
      process.exitCode = 1;
    });
}
