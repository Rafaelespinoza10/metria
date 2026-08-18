export interface WorkoutSetInput {
  repetitions: number;
  weightKg?: number;
  rpe?: number;
}

export interface WorkoutExerciseInput {
  name: string;
  muscleGroup?: string;
  imageKey?: string;
  sets: WorkoutSetInput[];
}

export interface ExercisePhoto {
  imageKey: string;
  imageUrl: string;
}

export interface CreateWorkoutInput {
  name: string;
  performedAt: string;
  durationMinutes?: number;
  notes?: string;
  exercises: WorkoutExerciseInput[];
}

export interface WorkoutSet extends WorkoutSetInput {
  id: string;
  position: number;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  position: number;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  performedAt: string;
  localDate: string;
  durationMinutes: number | null;
  notes: string | null;
  exercises: WorkoutExercise[];
}
