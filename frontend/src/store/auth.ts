import { create } from 'zustand';
import i18n from '../i18n';
import { setAuthToken } from '../services/api';
import { clearSession, loadSession, saveSession } from '../services/session-storage';
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
    if (session) {
      setAuthToken(session.token);
      applyUserLocale(session.user);
      set({ status: 'signedIn', token: session.token, user: session.user });
    } else {
      set({ status: 'signedOut', token: null, user: null });
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
