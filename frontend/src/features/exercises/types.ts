import type { BodyRegion } from './regions';

export type ExerciseLevel = 'beginner' | 'intermediate' | 'expert';

export interface CatalogExercise {
  id: string;
  name: string;
  level: ExerciseLevel;
  equipment: string | null;
  region: BodyRegion;
  primaryMuscles: string[];
  imageUrls: string[];
}

export interface CatalogExerciseDetail extends CatalogExercise {
  secondaryMuscles: string[];
  instructions: string[];
}
