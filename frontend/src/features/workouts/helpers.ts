import type { WorkoutExerciseInput, WorkoutSetInput } from './types';

/** "8 × 80 kg" / "8 × 80 kg @9" / "12" — compact set line for lists. */
export function formatSet(set: WorkoutSetInput): string {
  const weight = set.weightKg !== undefined ? ` × ${set.weightKg} kg` : '';
  const rpe = set.rpe !== undefined ? ` @${set.rpe}` : '';
  return `${set.repetitions}${weight}${rpe}`;
}

/** A workout draft is submittable when named and every exercise has at least one set. */
export function isDraftSubmittable(name: string, exercises: WorkoutExerciseInput[]): boolean {
  return (
    name.trim().length > 0 &&
    exercises.length > 0 &&
    exercises.every((exercise) => exercise.name.trim().length > 0 && exercise.sets.length > 0)
  );
}

/** Total sets across the workout — shown on list cards. */
export function totalSets(exercises: { sets: unknown[] }[]): number {
  return exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
}

export interface WeeklySummary {
  workouts: number;
  sets: number;
  minutes: number;
}

function isoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Totals over the 7 days ending at `today` — the list screen's hero numbers. */
export function weeklySummary(
  workouts: {
    localDate: string;
    durationMinutes: number | null;
    exercises: { sets: unknown[] }[];
  }[],
  today: Date,
): WeeklySummary {
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  const cutoff = isoDate(start);
  const recent = workouts.filter((workout) => workout.localDate >= cutoff);
  return {
    workouts: recent.length,
    sets: recent.reduce((sum, workout) => sum + totalSets(workout.exercises), 0),
    minutes: recent.reduce((sum, workout) => sum + (workout.durationMinutes ?? 0), 0),
  };
}

/** First exercise photo in the workout — used as the card's image strip. */
export function firstExerciseImageUrl(workout: {
  exercises: { imageUrl: string | null }[];
}): string | null {
  return workout.exercises.find((exercise) => exercise.imageUrl)?.imageUrl ?? null;
}
