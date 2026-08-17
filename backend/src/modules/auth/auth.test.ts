import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb } from '../../database/client.js';
import { UsersRepository } from '../users/users.repository.js';
import type { PasswordResetMailer } from './mailer.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

class CaptureMailer implements PasswordResetMailer {
  sent: { to: string; token: string }[] = [];

  sendPasswordReset(to: string, token: string): Promise<void> {
    this.sent.push({ to, token });
    return Promise.resolve();
  }
}

const mailer = new CaptureMailer();
const app = createApp({ passwordResetMailer: mailer });
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

function uniqueEmail(): string {
  return `auth-test-${crypto.randomUUID()}@example.com`;
}

async function registerUser(email: string, password = 'password123') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name: 'Auth Test', timezone: 'America/Mexico_City' });
  if (res.status === 201) {
    createdUserIds.push((res.body as { data: { user: { id: string } } }).data.user.id);
  }
  return res;
}

describe.skipIf(!hasDatabase)('auth', () => {
  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('registers a user and returns a working token', async () => {
    const email = uniqueEmail();
    const res = await registerUser(email);

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const me = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);
  });

  it('rejects duplicate email with CONFLICT', async () => {
    const email = uniqueEmail();
    await registerUser(email);
    const res = await registerUser(email);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects invalid registration input with VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short', name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with correct credentials', async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('rejects wrong password and unknown email with the same generic message', async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: 'password123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('logout revokes previously issued tokens', async () => {
    const email = uniqueEmail();
    const registered = await registerUser(email);
    const token = registered.body.data.token as string;

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(200);

    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(401);
  });

  it('completes the password recovery cycle with a single-use token', async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);

    const sent = mailer.sent.find((entry) => entry.to === email);
    expect(sent).toBeDefined();
    if (!sent) return;

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: sent.token, newPassword: 'new-password-456' });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'new-password-456' });
    expect(newLogin.status).toBe(200);

    // Single use: the same token must not work twice.
    const reuse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: sent.token, newPassword: 'another-password-789' });
    expect(reuse.status).toBe(401);
  });

  it('forgot-password never reveals whether the email exists', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: uniqueEmail() });
    expect(res.status).toBe(200);
    expect(res.body.data.requested).toBe(true);
  });
});
