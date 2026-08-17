import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { closeDb, getDb } from '../../database/client.js';
import { users } from '../../database/schema/users.js';
import { UsersRepository } from './users.repository.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

const app = createApp();
const usersRepository = new UsersRepository();
const createdUserIds: string[] = [];

async function registerUser() {
  const email = `users-test-${crypto.randomUUID()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name: 'Users Test' });
  const data = (res.body as { data: { user: { id: string }; token: string } }).data;
  createdUserIds.push(data.user.id);
  return { email, token: data.token, id: data.user.id };
}

describe.skipIf(!hasDatabase)('users', () => {
  afterAll(async () => {
    for (const id of createdUserIds) {
      await usersRepository.hardDelete(id);
    }
    await closeDb();
  });

  it('rejects profile access without a token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('updates profile fields', async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Rafael', locale: 'es', timezone: 'America/Mexico_City' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Rafael');
    expect(res.body.data.user.locale).toBe('es');
    expect(res.body.data.user.timezone).toBe('America/Mexico_City');
  });

  it('rejects an invalid timezone', async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ timezone: 'Not/AZone' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('soft delete blocks tokens and login but keeps the row', async () => {
    const { email, token, id } = await registerUser();

    const del = await request(app).delete('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(login.status).toBe(401);

    const [row] = await getDb().select().from(users).where(eq(users.id, id));
    expect(row).toBeDefined();
    expect(row?.deletedAt).not.toBeNull();
  });

  it('permanent delete requires the correct password and removes the row', async () => {
    const { token, id } = await registerUser();

    const wrong = await request(app)
      .delete('/api/users/me/permanent')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'not-my-password' });
    expect(wrong.status).toBe(401);

    const res = await request(app)
      .delete('/api/users/me/permanent')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'password123' });
    expect(res.status).toBe(200);

    const [row] = await getDb().select().from(users).where(eq(users.id, id));
    expect(row).toBeUndefined();
  });
});
