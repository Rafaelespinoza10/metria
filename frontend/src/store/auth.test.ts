import { clearSession, loadSession, saveSession } from '../services/session-storage';
import { useAuthStore } from './auth';
import type { AuthUser } from '../features/auth/types';

const user: AuthUser = {
  id: 'user-1',
  email: 'rafael@example.com',
  name: 'Rafael',
  locale: 'es',
  timezone: 'America/Mexico_City',
  birthDate: null,
  heightCm: null,
  createdAt: '2026-08-16T00:00:00.000Z',
};

describe('auth store', () => {
  beforeEach(async () => {
    // hydrate revalidates against /api/users/me — default to an offline network
    // so tests exercise the cached-session path unless they mock a response.
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    await clearSession();
    useAuthStore.setState({ status: 'loading', token: null, user: null });
  });

  it('hydrates to signedOut when no session is stored', async () => {
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('signIn persists the session and updates state', async () => {
    await useAuthStore.getState().signIn('token-abc', user);

    expect(useAuthStore.getState()).toMatchObject({
      status: 'signedIn',
      token: 'token-abc',
      user,
    });
    await expect(loadSession()).resolves.toEqual({ token: 'token-abc', user });
  });

  it('hydrates to signedIn from a stored session even when revalidation is offline', async () => {
    await saveSession({ token: 'token-abc', user });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'signedIn',
      token: 'token-abc',
      user,
    });
  });

  it('hydrate revalidates the profile from /api/users/me', async () => {
    await saveSession({ token: 'token-abc', user });
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ ok: true, data: { user: { ...user, name: 'Rafa v2' } } }),
    });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().user?.name).toBe('Rafa v2');
    await expect(loadSession()).resolves.toMatchObject({ user: { name: 'Rafa v2' } });
  });

  it('hydrate signs out when the stored token is rejected with 401', async () => {
    await saveSession({ token: 'token-dead', user });
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      status: 401,
      json: () =>
        Promise.resolve({ ok: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }),
    });

    await useAuthStore.getState().hydrate();
    // signOut runs via the global 401 handler; flush its microtasks.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(useAuthStore.getState().status).toBe('signedOut');
    await expect(loadSession()).resolves.toBeNull();
  });

  it('setUser replaces the profile in place (used after PATCH /users/me)', async () => {
    await useAuthStore.getState().signIn('token-abc', user);
    useAuthStore.getState().setUser({ ...user, name: 'Rafa', locale: 'en' });

    expect(useAuthStore.getState().user).toMatchObject({ name: 'Rafa', locale: 'en' });
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('signOut clears the stored session and state', async () => {
    await useAuthStore.getState().signIn('token-abc', user);
    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'signedOut',
      token: null,
      user: null,
    });
    await expect(loadSession()).resolves.toBeNull();
  });
});
