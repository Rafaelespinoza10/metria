import { useMutation } from '@tanstack/react-query';
import i18n from '../../i18n';
import { useAuthStore } from '../../store/auth';
import { permanentDeleteAccount, softDeleteAccount, updateProfile } from './api';

export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: ({ user }) => {
      setUser(user);
      if (user.locale === 'en' || user.locale === 'es') {
        void i18n.changeLanguage(user.locale);
      }
    },
  });
}

export function useSoftDeleteAccount() {
  const signOut = useAuthStore((state) => state.signOut);
  return useMutation({
    mutationFn: softDeleteAccount,
    onSuccess: () => signOut(),
  });
}

export function usePermanentDeleteAccount() {
  const signOut = useAuthStore((state) => state.signOut);
  return useMutation({
    mutationFn: permanentDeleteAccount,
    onSuccess: () => signOut(),
  });
}
