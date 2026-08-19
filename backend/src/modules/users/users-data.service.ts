import { AppError } from '../../shared/errors/app-error.js';
import { localDateFor } from '../../shared/utils/local-date.js';
import type {
  ImportCounts,
  ImportRows,
  UserStats,
  UsersDataRepository,
} from './users-data.repository.js';
import { EXPORT_VERSION, importDocumentSchema } from './users.export.schema.js';
import type { UsersRepository } from './users.repository.js';
import { toPublicUser } from './users.types.js';

export interface JourneyStats {
  memberSince: string;
  daysTracked: number;
  totals: Omit<UserStats, 'daysTracked'>;
}

export class UsersDataService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly dataRepository: UsersDataRepository,
  ) {}

  async stats(userId: string): Promise<JourneyStats> {
    const user = await this.requireUser(userId);
    const { daysTracked, ...totals } = await this.dataRepository.stats(userId);
    return {
      memberSince: localDateFor(user.createdAt, user.timezone),
      daysTracked,
      totals,
    };
  }

  /** Full, self-contained backup document. Binary files (photos) are not included. */
  async exportAll(userId: string, exportedAt: Date): Promise<Record<string, unknown>> {
    const user = await this.requireUser(userId);
    const data = await this.dataRepository.exportAll(userId);
    const typeKeyById = new Map(data.typeRows.map((type) => [type.id, type.key]));

    const itemsByMeal = groupBy(data.itemRows, (item) => item.mealId);
    const exercisesByWorkout = groupBy(data.exerciseRows, (exercise) => exercise.workoutId);
    const setsByExercise = groupBy(data.setRows, (set) => set.exerciseId);

    return {
      version: EXPORT_VERSION,
      exportedAt: exportedAt.toISOString(),
      profile: toPublicUser(user),
      goals: data.goalRows.map((goal) => ({
        category: goal.category,
        metric: goal.metric,
        measurementTypeKey: goal.measurementTypeId
          ? (typeKeyById.get(goal.measurementTypeId) ?? null)
          : null,
        startValue: goal.startValue,
        targetValue: goal.targetValue,
        targetDate: goal.targetDate,
        status: goal.status,
      })),
      dailyTargets: data.targetRows.map((target) => ({
        metric: target.metric,
        value: target.value,
        effectiveFrom: target.effectiveFrom,
      })),
      measurementTypes: data.typeRows.map((type) => ({ key: type.key, unit: type.unit })),
      measurements: data.measurementRows.map((measurement) => ({
        typeKey: typeKeyById.get(measurement.typeId) ?? null,
        value: measurement.value,
        measuredAt: measurement.measuredAt.toISOString(),
        notes: measurement.notes,
      })),
      meals: data.mealRows.map((meal) => ({
        category: meal.category,
        name: meal.name,
        eatenAt: meal.eatenAt.toISOString(),
        notes: meal.notes,
        items: (itemsByMeal.get(meal.id) ?? []).map((item) => ({
          name: item.name,
          grams: item.grams,
          calories: item.calories,
          protein: item.protein,
          carbohydrates: item.carbohydrates,
          fat: item.fat,
        })),
      })),
      activity: data.activityRows.map((entry) => ({
        localDate: entry.localDate,
        steps: entry.steps,
        activeMinutes: entry.activeMinutes,
        notes: entry.notes,
      })),
      sleep: data.sleepRows.map((entry) => ({
        bedtime: entry.bedtime.toISOString(),
        wakeTime: entry.wakeTime.toISOString(),
        quality: entry.quality,
        notes: entry.notes,
      })),
      workouts: data.workoutRows.map((workout) => ({
        name: workout.name,
        performedAt: workout.performedAt.toISOString(),
        durationMinutes: workout.durationMinutes,
        notes: workout.notes,
        exercises: (exercisesByWorkout.get(workout.id) ?? []).map((exercise) => ({
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: (setsByExercise.get(exercise.id) ?? []).map((set) => ({
            repetitions: set.repetitions,
            weightKg: set.weightKg,
            rpe: set.rpe,
            notes: set.notes,
          })),
        })),
      })),
    };
  }

  /**
   * Restores a document into the authenticated account. Local dates are recomputed from
   * the timestamps in the user's current timezone, exactly like live writes do.
   */
  async importAll(userId: string, document: unknown): Promise<ImportCounts> {
    const user = await this.requireUser(userId);
    const parsed = importDocumentSchema.safeParse(document);
    if (!parsed.success) {
      throw AppError.validation('Invalid Metria export document');
    }
    const doc = parsed.data;
    const timezone = user.timezone;
    const types = await this.dataRepository.measurementTypesFor(userId);
    const typeIdByKey = new Map(types.map((type) => [type.key, type.id]));

    const rows: ImportRows = {
      goals: doc.goals.map((goal) => ({
        userId,
        category: goal.category,
        metric: goal.metric,
        measurementTypeId: goal.measurementTypeKey
          ? (typeIdByKey.get(goal.measurementTypeKey) ?? null)
          : null,
        startValue: goal.startValue ?? null,
        targetValue: goal.targetValue ?? null,
        targetDate: goal.targetDate ?? null,
        status: goal.status,
      })),
      dailyTargets: dedupeBy(
        doc.dailyTargets.map((target) => ({
          userId,
          metric: target.metric,
          value: target.value,
          effectiveFrom: target.effectiveFrom,
        })),
        (target) => `${target.metric}:${target.effectiveFrom}`,
      ),
      // Measurements whose type key does not exist in this installation are skipped.
      measurements: doc.measurements.flatMap((measurement) => {
        const typeId = typeIdByKey.get(measurement.typeKey);
        if (!typeId) return [];
        return [
          {
            userId,
            typeId,
            value: measurement.value,
            measuredAt: new Date(measurement.measuredAt),
            notes: measurement.notes ?? null,
          },
        ];
      }),
      meals: doc.meals.map((meal) => {
        const eatenAt = new Date(meal.eatenAt);
        return {
          meal: {
            userId,
            category: meal.category,
            name: meal.name,
            eatenAt,
            localDate: localDateFor(eatenAt, timezone),
            notes: meal.notes ?? null,
          },
          items: meal.items.map((item, index) => ({
            name: item.name,
            grams: item.grams ?? null,
            calories: item.calories,
            protein: item.protein,
            carbohydrates: item.carbohydrates,
            fat: item.fat,
            position: index,
          })),
        };
      }),
      activity: dedupeBy(
        doc.activity.map((entry) => ({
          userId,
          localDate: entry.localDate,
          steps: entry.steps,
          activeMinutes: entry.activeMinutes,
          notes: entry.notes ?? null,
        })),
        (entry) => entry.localDate,
      ),
      sleep: dedupeBy(
        doc.sleep.map((entry) => {
          const bedtime = new Date(entry.bedtime);
          const wakeTime = new Date(entry.wakeTime);
          return {
            userId,
            bedtime,
            wakeTime,
            durationMinutes: Math.round((wakeTime.getTime() - bedtime.getTime()) / 60000),
            localDate: localDateFor(wakeTime, timezone),
            quality: entry.quality ?? null,
            notes: entry.notes ?? null,
          };
        }),
        (entry) => entry.localDate,
      ).filter((entry) => entry.durationMinutes > 0 && entry.durationMinutes <= 24 * 60),
      workouts: doc.workouts.map((workout) => {
        const performedAt = new Date(workout.performedAt);
        return {
          workout: {
            userId,
            name: workout.name,
            performedAt,
            localDate: localDateFor(performedAt, timezone),
            durationMinutes: workout.durationMinutes ?? null,
            notes: workout.notes ?? null,
          },
          exercises: workout.exercises.map((exercise, exerciseIndex) => ({
            exercise: {
              name: exercise.name,
              muscleGroup: exercise.muscleGroup ?? null,
              position: exerciseIndex,
            },
            sets: exercise.sets.map((set, setIndex) => ({
              position: setIndex,
              repetitions: set.repetitions,
              weightKg: set.weightKg ?? null,
              rpe: set.rpe ?? null,
              notes: set.notes ?? null,
            })),
          })),
        };
      }),
    };

    return this.dataRepository.importAll(rows);
  }

  private async requireUser(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    return user;
  }
}

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const row of rows) {
    const bucket = grouped.get(key(row));
    if (bucket) bucket.push(row);
    else grouped.set(key(row), [row]);
  }
  return grouped;
}

/** Keeps the first entry per key so a document can never violate a day-unique index. */
function dedupeBy<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = key(row);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
