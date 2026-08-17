import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import { workoutExercises, workoutSets, workouts } from '../../database/schema/workouts.js';
import type { WorkoutExerciseInput } from './workouts.schema.js';

export type WorkoutRow = typeof workouts.$inferSelect;
export type WorkoutExerciseRow = typeof workoutExercises.$inferSelect;
export type WorkoutSetRow = typeof workoutSets.$inferSelect;

export interface ExerciseWithSets extends WorkoutExerciseRow {
  sets: WorkoutSetRow[];
}

export interface WorkoutWithExercises extends WorkoutRow {
  exercises: ExerciseWithSets[];
}

export interface CreateWorkoutData {
  userId: string;
  name: string;
  performedAt: Date;
  localDate: string;
  durationMinutes?: number | undefined;
  notes?: string | undefined;
  exercises: WorkoutExerciseInput[];
}

export interface UpdateWorkoutData {
  name?: string | undefined;
  performedAt?: Date | undefined;
  localDate?: string | undefined;
  durationMinutes?: number | null | undefined;
  notes?: string | null | undefined;
  exercises?: WorkoutExerciseInput[] | undefined;
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

async function insertExerciseTree(
  tx: Tx,
  workoutId: string,
  exercises: WorkoutExerciseInput[],
): Promise<ExerciseWithSets[]> {
  const result: ExerciseWithSets[] = [];
  for (const [position, exercise] of exercises.entries()) {
    const [exerciseRow] = await tx
      .insert(workoutExercises)
      .values({
        workoutId,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup ?? null,
        position,
      })
      .returning();
    if (!exerciseRow) throw new Error('workout_exercises insert returned no row');
    const setRows = await tx
      .insert(workoutSets)
      .values(
        exercise.sets.map((set, setPosition) => ({
          exerciseId: exerciseRow.id,
          position: setPosition,
          repetitions: set.repetitions,
          weightKg: set.weightKg ?? null,
          rpe: set.rpe ?? null,
          notes: set.notes ?? null,
        })),
      )
      .returning();
    result.push({ ...exerciseRow, sets: setRows });
  }
  return result;
}

export class WorkoutsRepository {
  private get db() {
    return getDb();
  }

  async create(data: CreateWorkoutData): Promise<WorkoutWithExercises> {
    return this.db.transaction(async (tx) => {
      const { exercises, ...workout } = data;
      const [row] = await tx.insert(workouts).values(workout).returning();
      if (!row) throw new Error('workouts insert returned no row');
      const tree = await insertExerciseTree(tx, row.id, exercises);
      return { ...row, exercises: tree };
    });
  }

  async listRange(userId: string, from?: string, to?: string): Promise<WorkoutWithExercises[]> {
    const rows = await this.db
      .select()
      .from(workouts)
      .where(and(eq(workouts.userId, userId), isNull(workouts.deletedAt)))
      .orderBy(desc(workouts.performedAt))
      .limit(200);
    const filtered = rows.filter(
      (row) => (!from || row.localDate >= from) && (!to || row.localDate <= to),
    );
    return this.attachExercises(filtered);
  }

  async findByIdForUser(id: string, userId: string): Promise<WorkoutWithExercises | undefined> {
    const [row] = await this.db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, id), eq(workouts.userId, userId), isNull(workouts.deletedAt)))
      .limit(1);
    if (!row) return undefined;
    const [withExercises] = await this.attachExercises([row]);
    return withExercises;
  }

  async update(
    id: string,
    userId: string,
    data: UpdateWorkoutData,
  ): Promise<WorkoutWithExercises | undefined> {
    return this.db.transaction(async (tx) => {
      const { exercises, ...fields } = data;
      const [row] = await tx
        .update(workouts)
        .set({ ...fields, updatedAt: new Date() })
        .where(and(eq(workouts.id, id), eq(workouts.userId, userId), isNull(workouts.deletedAt)))
        .returning();
      if (!row) return undefined;

      if (exercises) {
        await tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, row.id));
        const tree = await insertExerciseTree(tx, row.id, exercises);
        return { ...row, exercises: tree };
      }
      return undefined; // caller refetches when exercises untouched
    });
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .update(workouts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(workouts.id, id), eq(workouts.userId, userId), isNull(workouts.deletedAt)))
      .returning({ id: workouts.id });
    return row !== undefined;
  }

  private async attachExercises(rows: WorkoutRow[]): Promise<WorkoutWithExercises[]> {
    if (rows.length === 0) return [];
    const exercises = await this.db
      .select()
      .from(workoutExercises)
      .where(
        inArray(
          workoutExercises.workoutId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(workoutExercises.position));
    const sets = exercises.length
      ? await this.db
          .select()
          .from(workoutSets)
          .where(
            inArray(
              workoutSets.exerciseId,
              exercises.map((exercise) => exercise.id),
            ),
          )
          .orderBy(asc(workoutSets.position))
      : [];

    const setsByExercise = new Map<string, WorkoutSetRow[]>();
    for (const set of sets) {
      const list = setsByExercise.get(set.exerciseId) ?? [];
      list.push(set);
      setsByExercise.set(set.exerciseId, list);
    }
    const exercisesByWorkout = new Map<string, ExerciseWithSets[]>();
    for (const exercise of exercises) {
      const list = exercisesByWorkout.get(exercise.workoutId) ?? [];
      list.push({ ...exercise, sets: setsByExercise.get(exercise.id) ?? [] });
      exercisesByWorkout.set(exercise.workoutId, list);
    }
    return rows.map((row) => ({ ...row, exercises: exercisesByWorkout.get(row.id) ?? [] }));
  }
}
