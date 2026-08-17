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
