import { ApiError } from '../../services/api';

/** Maps API failures to calm, specific copy keys. */
export function authErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'UNAUTHORIZED') return 'auth.errors.invalidCredentials';
    if (error.code === 'CONFLICT') return 'auth.errors.emailTaken';
    if (error.code === 'VALIDATION_ERROR') return 'auth.errors.invalidInput';
  }
  return 'auth.errors.generic';
}
