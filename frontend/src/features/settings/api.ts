import { api } from '../../services/api';
import type { AuthUser } from '../auth/types';

export interface UpdateProfileInput {
  name?: string;
  locale?: 'en' | 'es';
  timezone?: string;
}

export function updateProfile(input: UpdateProfileInput): Promise<{ user: AuthUser }> {
  return api<{ user: AuthUser }>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
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
