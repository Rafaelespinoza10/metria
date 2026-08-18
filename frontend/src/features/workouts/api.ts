import { api } from '../../services/api';
import type { CreateWorkoutInput, ExercisePhoto, Workout } from './types';

export function fetchWorkouts(): Promise<{ workouts: Workout[] }> {
  return api<{ workouts: Workout[] }>('/api/workouts');
}

export function createWorkout(input: CreateWorkoutInput): Promise<{ workout: Workout }> {
  return api<{ workout: Workout }>('/api/workouts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function uploadExercisePhoto(photo: {
  uri: string;
  mimeType: string;
  fileName: string;
}): Promise<{ photo: ExercisePhoto }> {
  const formData = new FormData();
  formData.append('photo', {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob);
  return api<{ photo: ExercisePhoto }>('/api/workouts/exercise-photos', {
    method: 'POST',
    body: formData,
  });
}
