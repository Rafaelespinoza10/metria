import { clearSession, loadSession, saveSession } from '../services/session-storage';
import { useAuthStore } from './auth';
import type { AuthUser } from '../features/auth/types';

const user: AuthUser = {
  id: 'user-1',
  email: 'rafael@example.com',
  name: 'Rafael',
  locale: 'es',
  timezone: 'America/Mexico_City',
  createdAt: '2026-08-16T00:00:00.000Z',
};

describe('auth store', () => {
  beforeEach(async () => {
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

  it('hydrates to signedIn from a stored session', async () => {
    await saveSession({ token: 'token-abc', user });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'signedIn',
      token: 'token-abc',
      user,
    });
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
