import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from './client.js';
import { seed } from './seed.js';
import { activityEntries } from './schema/activity.js';
import { userBadges } from './schema/gamification.js';
import { goals } from './schema/goals.js';
import { measurements, measurementTypes } from './schema/measurements.js';
import { mealItems, meals } from './schema/nutrition.js';
import { sleepEntries } from './schema/sleep.js';
import { users } from './schema/users.js';
import { workoutExercises, workouts, workoutSets } from './schema/workouts.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

// Integration smoke test: requires a migrated database. Skipped (e.g. in CI) without one.
describe.skipIf(!hasDatabase)('database schema', () => {
  afterAll(async () => {
    await closeDb();
  });

  it('accepts one row per user-owned table and cascades on hard delete', async () => {
    const db = getDb();
    await seed();

    const [user] = await db
      .insert(users)
      .values({
        email: `schema-test-${crypto.randomUUID()}@example.com`,
        passwordHash: 'not-a-real-hash',
        name: 'Schema Test',
        timezone: 'America/Mexico_City',
      })
      .returning();
    if (!user) throw new Error('user insert returned no row');

    const weightType = await db.query.measurementTypes.findFirst({
      where: eq(measurementTypes.key, 'weight'),
    });
    expect(weightType).toBeDefined();
    if (!weightType) return;

    await db.insert(measurements).values({
      userId: user.id,
      typeId: weightType.id,
      value: 82.3,
      measuredAt: new Date(),
    });

    await db.insert(goals).values({
      userId: user.id,
      category: 'lose_fat',
      metric: 'weight',
      startValue: 82.3,
      targetValue: 78,
    });

    const [meal] = await db
      .insert(meals)
      .values({
        userId: user.id,
        category: 'lunch',
        name: 'Grilled chicken with rice',
        eatenAt: new Date(),
        localDate: '2026-08-16',
      })
      .returning();
    if (!meal) throw new Error('meal insert returned no row');

    await db.insert(mealItems).values({
      mealId: meal.id,
      name: 'Grilled chicken breast',
      grams: 180,
      calories: 297,
      protein: 55,
      carbohydrates: 0,
      fat: 6,
      position: 0,
    });

    await db.insert(activityEntries).values({
      userId: user.id,
      localDate: '2026-08-16',
      steps: 8420,
      activeMinutes: 45,
    });

    // Unique (user_id, local_date) among non-deleted rows must reject a duplicate.
    await expect(
      db.insert(activityEntries).values({ userId: user.id, localDate: '2026-08-16' }),
    ).rejects.toThrow();

    const [workout] = await db
      .insert(workouts)
      .values({
        userId: user.id,
        name: 'Push day',
        performedAt: new Date(),
        localDate: '2026-08-16',
        durationMinutes: 60,
      })
      .returning();
    if (!workout) throw new Error('workout insert returned no row');

    const [exercise] = await db
      .insert(workoutExercises)
      .values({ workoutId: workout.id, name: 'Bench press', muscleGroup: 'chest', position: 0 })
      .returning();
    if (!exercise) throw new Error('exercise insert returned no row');

    await db.insert(workoutSets).values({
      exerciseId: exercise.id,
      position: 0,
      repetitions: 8,
      weightKg: 80,
      rpe: 8,
    });

    await db.insert(sleepEntries).values({
      userId: user.id,
      bedtime: new Date('2026-08-15T23:00:00Z'),
      wakeTime: new Date('2026-08-16T06:34:00Z'),
      durationMinutes: 454,
      localDate: '2026-08-16',
      quality: 4,
    });

    await db
      .insert(userBadges)
      .values({ userId: user.id, badgeKey: 'workouts_10', awardedAt: new Date() });

    // Hard delete: cascades must remove every owned row (permanent-deletion path).
    await db.delete(users).where(eq(users.id, user.id));

    const remainingMeals = await db.query.meals.findMany({ where: eq(meals.userId, user.id) });
    const remainingSets = await db.query.workoutSets.findMany({
      where: eq(workoutSets.exerciseId, exercise.id),
    });
    expect(remainingMeals).toHaveLength(0);
    expect(remainingSets).toHaveLength(0);
  });
});
