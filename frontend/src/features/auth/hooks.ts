import { useMutation } from '@tanstack/react-query';
import { getCalendars } from 'expo-localization';
import i18n from '../../i18n';
import { useAuthStore } from '../../store/auth';
import { login, logout, register } from './api';

export function useLogin() {
  const signIn = useAuthStore((state) => state.signIn);
  return useMutation({
    mutationFn: login,
    onSuccess: ({ token, user }) => signIn(token, user),
  });
}

export interface RegisterFormInput {
  name: string;
  email: string;
  password: string;
}

export function useRegister() {
  const signIn = useAuthStore((state) => state.signIn);
  return useMutation({
    mutationFn: (input: RegisterFormInput) =>
      register({
        ...input,
        locale: i18n.language === 'es' ? 'es' : 'en',
        timezone: getCalendars()[0]?.timeZone ?? undefined,
      }),
    onSuccess: ({ token, user }) => signIn(token, user),
  });
}

export function useLogout() {
  const signOut = useAuthStore((state) => state.signOut);
  return useMutation({
    mutationFn: logout,
    // Local sign-out always happens, even if the server call fails offline.
    onSettled: () => signOut(),
  });
}
