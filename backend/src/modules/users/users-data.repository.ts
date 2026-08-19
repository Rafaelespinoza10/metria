import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { activityEntries } from '../../database/schema/activity.js';
import { goals } from '../../database/schema/goals.js';
import { measurementTypes, measurements } from '../../database/schema/measurements.js';
import { dailyTargets } from '../../database/schema/targets.js';
import { mealItems, meals } from '../../database/schema/nutrition.js';
import { sleepEntries } from '../../database/schema/sleep.js';
import { workoutExercises, workoutSets, workouts } from '../../database/schema/workouts.js';

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

export interface ImportRows {
  goals: (typeof goals.$inferInsert)[];
  dailyTargets: (typeof dailyTargets.$inferInsert)[];
  measurements: (typeof measurements.$inferInsert)[];
  meals: {
    meal: typeof meals.$inferInsert;
    items: Omit<typeof mealItems.$inferInsert, 'mealId'>[];
  }[];
  activity: (typeof activityEntries.$inferInsert)[];
  sleep: (typeof sleepEntries.$inferInsert)[];
  workouts: {
    workout: typeof workouts.$inferInsert;
    exercises: {
      exercise: Omit<typeof workoutExercises.$inferInsert, 'workoutId'>;
      sets: Omit<typeof workoutSets.$inferInsert, 'exerciseId'>[];
    }[];
  }[];
}

export interface ImportCounts {
  goals: number;
  dailyTargets: number;
  measurements: number;
  meals: number;
  activity: number;
  sleep: number;
  workouts: number;
}

export interface UserStats {
  daysTracked: number;
  meals: number;
  workouts: number;
  sleepNights: number;
  measurements: number;
  photos: number;
  steps: number;
}

/** Unbounded, user-scoped reads for export plus lifetime counters for the stats card. */
export class UsersDataRepository {
  private get db() {
    return getDb();
  }

  async stats(userId: string): Promise<UserStats> {
    const result = await this.db.execute<Record<string, number>>(sql`
      SELECT
        (SELECT count(DISTINCT d)::int FROM (
          SELECT local_date AS d FROM meals
            WHERE user_id = ${userId} AND deleted_at IS NULL
          UNION SELECT local_date FROM activity_entries
            WHERE user_id = ${userId} AND deleted_at IS NULL
          UNION SELECT local_date FROM sleep_entries
            WHERE user_id = ${userId} AND deleted_at IS NULL
          UNION SELECT local_date FROM workouts
            WHERE user_id = ${userId} AND deleted_at IS NULL
        ) tracked) AS days_tracked,
        (SELECT count(*)::int FROM meals
          WHERE user_id = ${userId} AND deleted_at IS NULL) AS meals,
        (SELECT count(*)::int FROM workouts
          WHERE user_id = ${userId} AND deleted_at IS NULL) AS workouts,
        (SELECT count(*)::int FROM sleep_entries
          WHERE user_id = ${userId} AND deleted_at IS NULL) AS sleep_nights,
        (SELECT count(*)::int FROM measurements
          WHERE user_id = ${userId} AND deleted_at IS NULL) AS measurements,
        (SELECT count(*)::int FROM progress_photos
          WHERE user_id = ${userId} AND deleted_at IS NULL) AS photos,
        (SELECT coalesce(sum(steps), 0)::int FROM activity_entries
          WHERE user_id = ${userId} AND deleted_at IS NULL) AS steps
    `);
    const [row] = result.rows;
    return {
      daysTracked: row?.days_tracked ?? 0,
      meals: row?.meals ?? 0,
      workouts: row?.workouts ?? 0,
      sleepNights: row?.sleep_nights ?? 0,
      measurements: row?.measurements ?? 0,
      photos: row?.photos ?? 0,
      steps: row?.steps ?? 0,
    };
  }

  /** System types plus this user's custom ones. */
  async measurementTypesFor(userId: string) {
    return this.db
      .select()
      .from(measurementTypes)
      .where(or(isNull(measurementTypes.userId), eq(measurementTypes.userId, userId)))
      .orderBy(asc(measurementTypes.key));
  }

  async exportAll(userId: string) {
    const owned = <T extends { userId: unknown; deletedAt: unknown }>(table: T) =>
      and(eq(table.userId as never, userId), isNull(table.deletedAt as never));

    const [
      goalRows,
      targetRows,
      typeRows,
      measurementRows,
      mealRows,
      activityRows,
      sleepRows,
      workoutRows,
    ] = await Promise.all([
      this.db.select().from(goals).where(owned(goals)).orderBy(asc(goals.createdAt)),
      this.db
        .select()
        .from(dailyTargets)
        .where(owned(dailyTargets))
        .orderBy(asc(dailyTargets.effectiveFrom)),
      this.measurementTypesFor(userId),
      this.db
        .select()
        .from(measurements)
        .where(owned(measurements))
        .orderBy(asc(measurements.measuredAt)),
      this.db.select().from(meals).where(owned(meals)).orderBy(asc(meals.eatenAt)),
      this.db
        .select()
        .from(activityEntries)
        .where(owned(activityEntries))
        .orderBy(asc(activityEntries.localDate)),
      this.db
        .select()
        .from(sleepEntries)
        .where(owned(sleepEntries))
        .orderBy(asc(sleepEntries.localDate)),
      this.db.select().from(workouts).where(owned(workouts)).orderBy(asc(workouts.performedAt)),
    ]);

    const mealIds = mealRows.map((meal) => meal.id);
    const itemRows = mealIds.length
      ? await this.db
          .select()
          .from(mealItems)
          .where(sql`${mealItems.mealId} IN ${mealIds}`)
          .orderBy(asc(mealItems.position))
      : [];

    const workoutIds = workoutRows.map((workout) => workout.id);
    const exerciseRows = workoutIds.length
      ? await this.db
          .select()
          .from(workoutExercises)
          .where(sql`${workoutExercises.workoutId} IN ${workoutIds}`)
          .orderBy(asc(workoutExercises.position))
      : [];
    const exerciseIds = exerciseRows.map((exercise) => exercise.id);
    const setRows = exerciseIds.length
      ? await this.db
          .select()
          .from(workoutSets)
          .where(sql`${workoutSets.exerciseId} IN ${exerciseIds}`)
          .orderBy(asc(workoutSets.position))
      : [];

    return {
      goalRows,
      targetRows,
      typeRows,
      measurementRows,
      mealRows,
      itemRows,
      activityRows,
      sleepRows,
      workoutRows,
      exerciseRows,
      setRows,
    };
  }

  /**
   * All-or-nothing restore. Day-unique collections (activity, sleep, daily targets)
   * keep the rows the account already has; everything else appends.
   */
  async importAll(rows: ImportRows): Promise<ImportCounts> {
    return this.db.transaction(async (tx) => {
      const goalRows = rows.goals.length
        ? await tx.insert(goals).values(rows.goals).returning({ id: goals.id })
        : [];
      const targetRows = rows.dailyTargets.length
        ? await tx
            .insert(dailyTargets)
            .values(rows.dailyTargets)
            .onConflictDoNothing()
            .returning({ id: dailyTargets.id })
        : [];
      const measurementRows = rows.measurements.length
        ? await tx.insert(measurements).values(rows.measurements).returning({ id: measurements.id })
        : [];
      const activityRows = rows.activity.length
        ? await tx
            .insert(activityEntries)
            .values(rows.activity)
            .onConflictDoNothing()
            .returning({ id: activityEntries.id })
        : [];
      const sleepRows = rows.sleep.length
        ? await tx
            .insert(sleepEntries)
            .values(rows.sleep)
            .onConflictDoNothing()
            .returning({ id: sleepEntries.id })
        : [];

      return {
        goals: goalRows.length,
        dailyTargets: targetRows.length,
        measurements: measurementRows.length,
        activity: activityRows.length,
        sleep: sleepRows.length,
        meals: await this.insertMeals(tx, rows.meals),
        workouts: await this.insertWorkouts(tx, rows.workouts),
      };
    });
  }

  private async insertMeals(tx: Tx, rows: ImportRows['meals']): Promise<number> {
    let count = 0;
    for (const { meal, items } of rows) {
      const [inserted] = await tx.insert(meals).values(meal).returning({ id: meals.id });
      if (!inserted) continue;
      count += 1;
      if (items.length) {
        await tx.insert(mealItems).values(items.map((item) => ({ ...item, mealId: inserted.id })));
      }
    }
    return count;
  }

  private async insertWorkouts(tx: Tx, rows: ImportRows['workouts']): Promise<number> {
    let count = 0;
    for (const { workout, exercises } of rows) {
      const [inserted] = await tx.insert(workouts).values(workout).returning({ id: workouts.id });
      if (!inserted) continue;
      count += 1;
      for (const { exercise, sets } of exercises) {
        const [insertedExercise] = await tx
          .insert(workoutExercises)
          .values({ ...exercise, workoutId: inserted.id })
          .returning({ id: workoutExercises.id });
        if (!insertedExercise || !sets.length) continue;
        await tx
          .insert(workoutSets)
          .values(sets.map((set) => ({ ...set, exerciseId: insertedExercise.id })));
      }
    }
    return count;
  }
}
