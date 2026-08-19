import { api } from '../../services/api';
import type { CreateGoalInput, Goal, GoalStatus, UpdateGoalInput } from './types';

export function fetchGoals(status?: GoalStatus): Promise<{ goals: Goal[] }> {
  const query = status ? `?status=${status}` : '';
  return api<{ goals: Goal[] }>(`/api/goals${query}`);
}

export function createGoal(input: CreateGoalInput): Promise<{ goal: Goal }> {
  return api<{ goal: Goal }>('/api/goals', { method: 'POST', body: JSON.stringify(input) });
}

export function updateGoal(id: string, input: UpdateGoalInput): Promise<{ goal: Goal }> {
  return api<{ goal: Goal }>(`/api/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteGoal(id: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(`/api/goals/${id}`, { method: 'DELETE' });
}
