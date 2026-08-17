import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../features/auth/types';

const TOKEN_KEY = 'metria.auth.token';
const USER_KEY = 'metria.auth.user';

export interface StoredSession {
  token: string;
  user: AuthUser;
}

export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

export async function loadSession(): Promise<StoredSession | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const rawUser = await SecureStore.getItemAsync(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
