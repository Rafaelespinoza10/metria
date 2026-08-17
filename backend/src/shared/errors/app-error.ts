export const errorCodes = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'AI_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError('NOT_FOUND', message, 404);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  static conflict(message: string): AppError {
    return new AppError('CONFLICT', message, 409);
  }

  static validation(message: string): AppError {
    return new AppError('VALIDATION_ERROR', message, 400);
  }
}
