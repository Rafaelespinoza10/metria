/** Port for delivering password-reset tokens. A real email provider plugs in later
 *  (Workflow 13+) without touching the auth service. */
export interface PasswordResetMailer {
  sendPasswordReset(to: string, token: string): Promise<void>;
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
