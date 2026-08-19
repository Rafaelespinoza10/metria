import { AppError } from '../../shared/errors/app-error.js';

/** Port for delivering password-reset tokens. A real email provider plugs in later
 *  (Workflow 13+) without touching the auth service. */
export interface PasswordResetMailer {
  sendPasswordReset(to: string, token: string): Promise<void>;
}

/** Production default until a real provider exists: the app boots and works,
 *  but forgot-password answers an honest 503 instead of leaking tokens to logs. */
export class UnconfiguredPasswordResetMailer implements PasswordResetMailer {
  sendPasswordReset(): Promise<void> {
    return Promise.reject(
      new AppError('SERVICE_UNAVAILABLE', 'Password reset email is not configured', 503),
    );
  }
}

export class ConsolePasswordResetMailer implements PasswordResetMailer {
  // Printing reset tokens to stdout is an account-takeover primitive in a log
  // aggregator — this implementation refuses to exist outside dev/test.
  constructor(nodeEnv: string) {
    if (nodeEnv === 'production') {
      throw new Error(
        'ConsolePasswordResetMailer must not run in production — wire a real mailer.',
      );
    }
  }

  sendPasswordReset(to: string, token: string): Promise<void> {
    console.log(`[mailer] Password reset requested for ${to}. Token: ${token}`);
    return Promise.resolve();
  }
}
