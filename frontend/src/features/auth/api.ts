import { api } from '../../services/api';
import type { AuthResult, AuthUser, LoginInput, RegisterInput } from './types';

export function login(input: LoginInput): Promise<AuthResult> {
  return api<AuthResult>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function register(input: RegisterInput): Promise<AuthResult> {
  return api<AuthResult>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function logout(): Promise<{ loggedOut: boolean }> {
  return api<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' });
}

export function fetchMe(): Promise<{ user: AuthUser }> {
  return api<{ user: AuthUser }>('/api/users/me');
}

export function forgotPassword(email: string): Promise<{ sent: boolean }> {
  return api<{ sent: boolean }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string): Promise<{ reset: boolean }> {
  return api<{ reset: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
