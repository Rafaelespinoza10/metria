import { ApiError } from '../../services/api';
import { authErrorKey } from './error-message';

describe('authErrorKey', () => {
  it.each([
    ['UNAUTHORIZED', 'auth.errors.invalidCredentials'],
    ['CONFLICT', 'auth.errors.emailTaken'],
    ['VALIDATION_ERROR', 'auth.errors.invalidInput'],
    ['INTERNAL_ERROR', 'auth.errors.generic'],
  ])('maps %s to %s', (code, expected) => {
    expect(authErrorKey(new ApiError(code, 'message', 400))).toBe(expected);
  });

  it('maps unknown errors to the generic key', () => {
    expect(authErrorKey(new Error('boom'))).toBe('auth.errors.generic');
    expect(authErrorKey(undefined)).toBe('auth.errors.generic');
  });
});
