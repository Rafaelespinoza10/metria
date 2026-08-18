import { api } from '../../services/api';
import type { CreateWorkoutInput, ExercisePhoto, Workout } from './types';

export interface WorkoutsFilter {
  from?: string;
  search?: string;
}

export interface WorkoutsPage {
  workouts: Workout[];
  total: number;
  limit: number;
  offset: number;
}

export function fetchWorkouts(filter: WorkoutsFilter, offset: number): Promise<WorkoutsPage> {
  const params = new URLSearchParams({ limit: '10', offset: String(offset) });
  if (filter.from) params.set('from', filter.from);
  if (filter.search) params.set('search', filter.search);
  return api<WorkoutsPage>(`/api/workouts?${params.toString()}`);
}

export function fetchWorkout(id: string): Promise<{ workout: Workout }> {
  return api<{ workout: Workout }>(`/api/workouts/${id}`);
}

export function deleteWorkout(id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/api/workouts/${id}`, { method: 'DELETE' });
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
