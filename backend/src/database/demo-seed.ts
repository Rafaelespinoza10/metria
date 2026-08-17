/** Demo account seeder: `npm run db:demo`. Local demo databases only. */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { addDaysISO } from '../shared/utils/date-range.js';
import { ActivityRepository } from '../modules/activity/activity.repository.js';
import { GoalsRepository } from '../modules/goals/goals.repository.js';
import { MeasurementsRepository } from '../modules/measurements/measurements.repository.js';
import { DailyTargetsRepository } from '../modules/nutrition/daily-targets.repository.js';
import { NutritionRepository } from '../modules/nutrition/nutrition.repository.js';
import { SleepRepository } from '../modules/sleep/sleep.repository.js';
import { WorkoutsRepository } from '../modules/workouts/workouts.repository.js';
import { closeDb, getDb } from './client.js';
import { users } from './schema/users.js';
import { seed } from './seed.js';

const DEMO_EMAIL = 'demo@metria.app';
const DEMO_PASSWORD = 'metria-demo-123';
const DAYS = 14;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function demoSeed(): Promise<void> {
  const db = getDb();
  await seed();

  // Idempotent: hard delete cascades every owned row.
  await db.delete(users).where(eq(users.email, DEMO_EMAIL));
  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      name: 'Rafael',
      locale: 'es',
      timezone: 'UTC',
    })
    .returning();
  if (!user) throw new Error('demo user insert failed');
  const userId = user.id;

  const targetsRepo = new DailyTargetsRepository();
  const start = addDaysISO(today(), -(DAYS + 7));
  await targetsRepo.upsert(userId, 'calories', 2200, start);
  await targetsRepo.upsert(userId, 'protein', 170, start);
  await targetsRepo.upsert(userId, 'steps', 10000, start);
  await targetsRepo.upsert(userId, 'active_minutes', 45, start);
  await targetsRepo.upsert(userId, 'sleep_minutes', 480, start);

  const measurementsRepo = new MeasurementsRepository();
  const types = await measurementsRepo.listTypesForUser(userId);
  const typeId = (key: string): string => {
    const type = types.find((candidate) => candidate.key === key);
    if (!type) throw new Error(`missing measurement type ${key}`);
    return type.id;
  };

  const goalsRepo = new GoalsRepository();
  await goalsRepo.create({
    userId,
    category: 'lose_fat',
    metric: 'weight',
    startValue: 83,
    targetValue: 78,
  });
  await goalsRepo.create({
    userId,
    category: 'improve_habits',
    metric: 'steps',
    targetValue: 10000,
  });

  const nutritionRepo = new NutritionRepository();
  const activityRepo = new ActivityRepository();
  const sleepRepo = new SleepRepository();
  const workoutsRepo = new WorkoutsRepository();

  for (let i = DAYS; i >= 1; i -= 1) {
    const day = addDaysISO(today(), -i);
    // Gentle upward trend so week-over-week deltas look real.
    const improving = i <= 7;

    await nutritionRepo.createMeal({
      userId,
      category: 'breakfast',
      name: 'Avena con fruta',
      eatenAt: new Date(`${day}T07:30:00.000Z`),
      localDate: day,
      items: [
        { name: 'Avena', grams: 80, calories: 300, protein: 10, carbohydrates: 54, fat: 6 },
        { name: 'Plátano', grams: 120, calories: 105, protein: 1, carbohydrates: 27, fat: 0.4 },
      ],
    });
    await nutritionRepo.createMeal({
      userId,
      category: 'lunch',
      name: 'Pollo con arroz',
      eatenAt: new Date(`${day}T13:00:00.000Z`),
      localDate: day,
      items: [
        {
          name: 'Pechuga de pollo',
          grams: 200,
          calories: 330,
          protein: 62,
          carbohydrates: 0,
          fat: 7,
        },
        { name: 'Arroz', grams: 180, calories: 234, protein: 5, carbohydrates: 50, fat: 0.6 },
      ],
    });
    await nutritionRepo.createMeal({
      userId,
      category: 'dinner',
      name: 'Salmón con verduras',
      eatenAt: new Date(`${day}T20:00:00.000Z`),
      localDate: day,
      items: [
        { name: 'Salmón', grams: 170, calories: 350, protein: 40, carbohydrates: 0, fat: 20 },
        { name: 'Verduras', grams: 200, calories: 90, protein: 4, carbohydrates: 16, fat: 1 },
        {
          name: 'Yogur griego',
          grams: 170,
          calories: 100,
          protein: 17,
          carbohydrates: 6,
          fat: 0.7,
        },
      ],
    });

    await activityRepo.upsert(userId, day, {
      steps: improving ? 10200 + i * 60 : 7800 + i * 40,
      activeMinutes: improving ? 50 : 35,
    });

    const sleepMinutes = improving ? 470 + (i % 3) * 10 : 400 + (i % 3) * 15;
    const wake = new Date(`${day}T06:30:00.000Z`);
    await sleepRepo.create({
      userId,
      bedtime: new Date(wake.getTime() - sleepMinutes * 60000),
      wakeTime: wake,
      durationMinutes: sleepMinutes,
      localDate: day,
      quality: improving ? 4 : 3,
    });

    if (i % 2 === 0) {
      await workoutsRepo.create({
        userId,
        name: i % 4 === 0 ? 'Día de empuje' : 'Día de jalón',
        performedAt: new Date(`${day}T18:00:00.000Z`),
        localDate: day,
        durationMinutes: 60,
        exercises: [
          {
            name: i % 4 === 0 ? 'Press de banca' : 'Remo con barra',
            muscleGroup: i % 4 === 0 ? 'Pecho' : 'Espalda',
            sets: [
              { repetitions: 8, weightKg: 70 + (DAYS - i) / 2, rpe: 8 },
              { repetitions: 8, weightKg: 70 + (DAYS - i) / 2, rpe: 8.5 },
              { repetitions: 6, weightKg: 75 + (DAYS - i) / 2, rpe: 9 },
            ],
          },
          {
            name: 'Sentadilla',
            muscleGroup: 'Piernas',
            sets: [{ repetitions: 10, weightKg: 90, rpe: 8 }],
          },
        ],
      });
    }

    if (i === DAYS || i === 7 || i === 1) {
      const progress = (DAYS - i) / (DAYS - 1);
      await measurementsRepo.create({
        userId,
        typeId: typeId('weight'),
        value: Math.round((83 - 1.4 * progress) * 10) / 10,
        measuredAt: new Date(`${day}T08:00:00.000Z`),
      });
      await measurementsRepo.create({
        userId,
        typeId: typeId('waist'),
        value: Math.round((90 - 1.6 * progress) * 10) / 10,
        measuredAt: new Date(`${day}T08:00:00.000Z`),
      });
      await measurementsRepo.create({
        userId,
        typeId: typeId('body_fat'),
        value: Math.round((21 - 0.8 * progress) * 10) / 10,
        measuredAt: new Date(`${day}T08:00:00.000Z`),
      });
    }
  }

  console.log(`Demo account ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

const isDirectRun = process.argv[1]?.endsWith('/demo-seed.ts') ?? false;
if (isDirectRun) {
  demoSeed()
    .then(async () => closeDb())
    .catch(async (error: unknown) => {
      console.error('Demo seed failed:', error);
      await closeDb();
      process.exitCode = 1;
    });
}
