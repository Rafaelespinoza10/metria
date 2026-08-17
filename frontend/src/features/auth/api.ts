import { api } from '../../services/api';
import type { AuthResult, LoginInput, RegisterInput } from './types';

export function login(input: LoginInput): Promise<AuthResult> {
  return api<AuthResult>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function register(input: RegisterInput): Promise<AuthResult> {
  return api<AuthResult>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function logout(): Promise<{ loggedOut: boolean }> {
  return api<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' });
}
