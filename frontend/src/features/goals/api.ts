import { api } from '../../services/api';
import type { CreateGoalInput, Goal, GoalStatus } from './types';

export function fetchGoals(status?: GoalStatus): Promise<{ goals: Goal[] }> {
  const query = status ? `?status=${status}` : '';
  return api<{ goals: Goal[] }>(`/api/goals${query}`);
}

export function createGoal(input: CreateGoalInput): Promise<{ goal: Goal }> {
  return api<{ goal: Goal }>('/api/goals', { method: 'POST', body: JSON.stringify(input) });
}
