import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import i18n from '../../i18n';
import { useAuthStore } from '../../store/auth';
import { fetchReport } from '../progress/api';
import {
  exportData,
  fetchStats,
  importData,
  permanentDeleteAccount,
  softDeleteAccount,
  updateProfile,
  type ImportCounts,
} from './api';
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

export function useJourneyStats() {
  return useQuery({ queryKey: ['users', 'stats'], queryFn: fetchStats });
}

/** Writes the backup to a cache file and hands it to the share sheet. */
export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const document = await exportData();
      const name = `metria-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(document));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
          dialogTitle: i18n.t('settings.exportData'),
        });
      }
      return file.uri;
    },
  });
}

/**
 * Picks a backup file and restores it. Resolves to null when the user closes the
 * picker, so "cancelled" never reads as a failure.
 */
export function useImportData() {
  const queryClient = useQueryClient();
  return useMutation<ImportCounts | null>({
    mutationFn: async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return null;
      const contents = await new File(asset.uri).text();
      const { imported } = await importData(JSON.parse(contents));
      return imported;
    },
    onSuccess: (imported) => {
      if (imported) void queryClient.invalidateQueries();
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
