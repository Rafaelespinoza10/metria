/** Port for delivering password-reset tokens. A real email provider plugs in later
 *  (Workflow 13+) without touching the auth service. */
export interface PasswordResetMailer {
  sendPasswordReset(to: string, token: string): Promise<void>;
}

export class ConsolePasswordResetMailer implements PasswordResetMailer {
  sendPasswordReset(to: string, token: string): Promise<void> {
    console.log(`[mailer] Password reset requested for ${to}. Token: ${token}`);
    return Promise.resolve();
  }
}
