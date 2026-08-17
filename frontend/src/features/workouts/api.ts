import { api } from '../../services/api';
import type { CreateWorkoutInput, Workout } from './types';

export function fetchWorkouts(): Promise<{ workouts: Workout[] }> {
  return api<{ workouts: Workout[] }>('/api/workouts');
}

export function createWorkout(input: CreateWorkoutInput): Promise<{ workout: Workout }> {
  return api<{ workout: Workout }>('/api/workouts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
