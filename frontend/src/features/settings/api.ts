import { api } from '../../services/api';
import type { AuthUser } from '../auth/types';

export interface UpdateProfileInput {
  name?: string;
  locale?: 'en' | 'es';
  timezone?: string;
  birthDate?: string | null;
  heightCm?: number | null;
}

export interface JourneyStats {
  memberSince: string;
  daysTracked: number;
  totals: {
    meals: number;
    workouts: number;
    sleepNights: number;
    measurements: number;
    photos: number;
    steps: number;
  };
}

export interface ImportCounts {
  goals: number;
  dailyTargets: number;
  measurements: number;
  meals: number;
  activity: number;
  sleep: number;
  workouts: number;
}

export function updateProfile(input: UpdateProfileInput): Promise<{ user: AuthUser }> {
  return api<{ user: AuthUser }>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchStats(): Promise<JourneyStats> {
  return api<JourneyStats>('/api/users/me/stats');
}

/** The whole backup document, kept opaque: the app only stores and re-sends it. */
export function exportData(): Promise<unknown> {
  return api<unknown>('/api/users/me/export');
}

export function importData(document: unknown): Promise<{ imported: ImportCounts }> {
  return api<{ imported: ImportCounts }>('/api/users/me/import', {
    method: 'POST',
    body: JSON.stringify(document),
  });
}

export function softDeleteAccount(): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>('/api/users/me', { method: 'DELETE' });
}

export function permanentDeleteAccount(password: string): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>('/api/users/me/permanent', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}
