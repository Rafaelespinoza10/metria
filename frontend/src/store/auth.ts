import { create } from 'zustand';
import i18n from '../i18n';
import { setAuthToken, setUnauthorizedHandler } from '../services/api';
import { clearSession, loadSession, saveSession } from '../services/session-storage';
import { fetchMe } from '../features/auth/api';
import type { AuthUser } from '../features/auth/types';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  user: AuthUser | null;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

function applyUserLocale(user: AuthUser): void {
  if (user.locale === 'en' || user.locale === 'es') {
    void i18n.changeLanguage(user.locale);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  token: null,
  user: null,

  hydrate: async () => {
    const session = await loadSession();
    if (!session) {
      set({ status: 'signedOut', token: null, user: null });
      return;
    }
    setAuthToken(session.token);
    applyUserLocale(session.user);
    set({ status: 'signedIn', token: session.token, user: session.user });
    // Revalidate the cached session: profile changes propagate, and a revoked or
    // expired token signs out via the global 401 handler. Network failures keep
    // the cached session so an offline boot still works.
    try {
      const { user } = await fetchMe();
      applyUserLocale(user);
      await saveSession({ token: session.token, user });
      set({ user });
    } catch {
      // 401s are handled by setUnauthorizedHandler; anything else keeps the cache.
    }
  },

  signIn: async (token, user) => {
    setAuthToken(token);
    await saveSession({ token, user });
    applyUserLocale(user);
    set({ status: 'signedIn', token, user });
  },

  signOut: async () => {
    setAuthToken(null);
    await clearSession();
    set({ status: 'signedOut', token: null, user: null });
  },

  setUser: (user) => set({ user }),
}));

// A 401 on any authenticated route means the token is dead: sign out globally
// instead of leaving a "signed in" app where every request silently fails.
setUnauthorizedHandler(() => {
  void useAuthStore.getState().signOut();
});
