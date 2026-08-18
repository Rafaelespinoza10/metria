import { useMutation } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import i18n from '../../i18n';
import { useAuthStore } from '../../store/auth';
import { fetchReport } from '../progress/api';
import { permanentDeleteAccount, softDeleteAccount, updateProfile } from './api';
import { buildReportHtml } from './report-html';

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

/** Fetches the 30-day report, renders it to a PDF on-device, and opens the share sheet. */
export function useExportReport() {
  return useMutation({
    mutationFn: async () => {
      const report = await fetchReport();
      const html = buildReportHtml(report, (key, options) => i18n.t(key, options));
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: i18n.t('settings.exportPdf'),
        });
      }
      return uri;
    },
  });
}
