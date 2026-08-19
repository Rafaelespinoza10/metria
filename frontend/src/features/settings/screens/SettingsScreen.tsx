import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { useAuthStore } from '../../../store/auth';
import { theme } from '../../../theme';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { useLogout } from '../../auth/hooks';
import { useGamification } from '../../gamification/hooks';
import { useLatestMeasurements } from '../../measurements/hooks';
import type { ImportCounts } from '../api';
import { ageFrom, bmiBand, bmiFrom, isValidBirthDate, isValidHeight } from '../body-data';
import { formatReportDate } from '../report-html';
import {
  useExportData,
  useExportReport,
  useImportData,
  useJourneyStats,
  useUpdateProfile,
} from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'Settings'>;

const LOCALES = ['en', 'es'] as const;

/** "Ana Torres" → "AT"; single names keep their first letter. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
      {children}
    </Text>
  );
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center rounded-3xl border border-black/5 bg-ink-900 p-4">
      <Text className="text-3xl font-bold tracking-tight text-content-primary">{value}</Text>
      <Text className="mt-0.5 text-center text-xs font-semibold uppercase tracking-widest text-content-tertiary">
        {label}
      </Text>
    </View>
  );
}

function JourneyStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="w-[31%] rounded-3xl border border-black/5 bg-ink-900 p-4">
      <Text className="text-2xl font-bold tracking-tight text-content-primary">{value}</Text>
      <Text className="mt-0.5 text-xs font-semibold text-content-tertiary">{label}</Text>
    </View>
  );
}

function BodyChip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-brand-soft px-3 py-1">
      <Text className="text-xs font-semibold text-brand">{label}</Text>
    </View>
  );
}

function DataRow({
  icon,
  title,
  hint,
  loading,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="flex-row items-center gap-4 border-b border-black/5 py-4 last:border-b-0"
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft">
        <Ionicons name={icon} size={22} color={theme.colors.brand.DEFAULT} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-content-primary">{title}</Text>
        <Text className="mt-0.5 text-sm text-content-secondary">{hint}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.content.tertiary} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.content.tertiary} />
      )}
    </PressableScale>
  );
}

/**
 * Mounted only once the profile is loaded, so the inputs can start from the stored
 * values without ever syncing state inside an effect.
 */
function BodyDataForm({
  birthDate: storedBirthDate,
  heightCm: storedHeightCm,
  saving,
  onSave,
}: {
  birthDate: string | null;
  heightCm: number | null;
  saving: boolean;
  onSave: (input: { birthDate: string | null; heightCm: number | null }) => void;
}) {
  const { t } = useTranslation();
  const [birthDate, setBirthDate] = useState(storedBirthDate ?? '');
  const [height, setHeight] = useState(storedHeightCm ? String(storedHeightCm) : '');

  const trimmedDate = birthDate.trim();
  const parsedHeight = height.trim() ? Number(height.trim().replace(',', '.')) : null;
  const dateValid = trimmedDate === '' || isValidBirthDate(trimmedDate);
  const heightValid =
    parsedHeight === null || (Number.isFinite(parsedHeight) && isValidHeight(parsedHeight));
  const changed =
    trimmedDate !== (storedBirthDate ?? '') || parsedHeight !== (storedHeightCm ?? null);

  return (
    <View className="mt-3 gap-4">
      <AuthTextField
        label={t('settings.birthDate')}
        placeholder={t('settings.birthDatePlaceholder')}
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
      />
      <AuthTextField
        label={t('settings.height')}
        placeholder={t('settings.heightPlaceholder')}
        value={height}
        onChangeText={setHeight}
        keyboardType="decimal-pad"
      />
      {!dateValid || !heightValid ? (
        <Text className="text-sm text-metric-heart">{t('settings.invalidBodyData')}</Text>
      ) : null}
      {changed && dateValid && heightValid ? (
        <AuthSubmitButton
          label={t('settings.saveBodyData')}
          loading={saving}
          onPress={() =>
            onSave({ birthDate: trimmedDate === '' ? null : trimmedDate, heightCm: parsedHeight })
          }
        />
      ) : null}
    </View>
  );
}

function ImportResult({ counts }: { counts: ImportCounts }) {
  const { t } = useTranslation();
  return (
    <Text className="mt-2 text-sm text-content-secondary">
      {t('settings.importSummary', {
        meals: counts.meals,
        workouts: counts.workouts,
        sleep: counts.sleep,
        measurements: counts.measurements,
      })}
    </Text>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateMutation = useUpdateProfile();
  const logoutMutation = useLogout();
  const reportMutation = useExportReport();
  const backupMutation = useExportData();
  const importMutation = useImportData();
  const gamificationQuery = useGamification();
  const statsQuery = useJourneyStats();
  const latestQuery = useLatestMeasurements();
  const [name, setName] = useState(user?.name ?? '');

  const nameChanged = name.trim().length > 0 && name.trim() !== user?.name;
  const streaks = gamificationQuery.data?.streaks;
  const badgesEarned =
    gamificationQuery.data?.badges.filter((badge) => badge.awardedAt !== null).length ?? 0;

  const age = ageFrom(user?.birthDate ?? null);
  const latestWeight =
    latestQuery.data?.find((entry) => entry.type.key === 'weight')?.measurement.value ?? null;
  const bmi = bmiFrom(latestWeight, user?.heightCm ?? null);
  const stats = statsQuery.data;
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('settings.title')} />

          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            className="mt-8 rounded-3xl border border-black/5 bg-ink-900 p-5"
          >
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
                <Text className="text-lg font-bold text-brand">{initials(user?.name ?? '')}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold tracking-tight text-content-primary">
                  {user?.name}
                </Text>
                <Text className="mt-0.5 text-sm text-content-secondary">{user?.email}</Text>
                {user?.createdAt ? (
                  <Text className="mt-1 text-xs text-content-tertiary">
                    {t('settings.memberSince', {
                      date: formatReportDate(user.createdAt.slice(0, 10)),
                    })}
                  </Text>
                ) : null}
              </View>
            </View>
            {age !== null || bmi !== null || user?.heightCm ? (
              <View className="mt-4 flex-row flex-wrap gap-2 border-t border-black/5 pt-4">
                {age !== null ? <BodyChip label={t('settings.age', { years: age })} /> : null}
                {user?.heightCm ? <BodyChip label={`${user.heightCm} cm`} /> : null}
                {latestWeight !== null ? <BodyChip label={`${latestWeight} kg`} /> : null}
                {bmi !== null ? (
                  <BodyChip
                    label={`${t('settings.bmi', { value: bmi })} · ${t(`settings.bmiBand.${bmiBand(bmi)}`)}`}
                  />
                ) : null}
              </View>
            ) : null}
          </Animated.View>

          {gamificationQuery.isPending ? (
            <View className="mt-3 flex-row gap-3">
              <SkeletonBlock className="h-24 flex-1 rounded-3xl" />
              <SkeletonBlock className="h-24 flex-1 rounded-3xl" />
              <SkeletonBlock className="h-24 flex-1 rounded-3xl" />
            </View>
          ) : (
            <Animated.View
              entering={FadeInDown.delay(120).springify()}
              className="mt-3 flex-row gap-3"
            >
              <ProfileStat
                value={`${streaks?.tracking.current ?? 0}`}
                label={t('settings.stats.streak')}
              />
              <ProfileStat
                value={`${streaks?.tracking.longest ?? 0}`}
                label={t('settings.stats.longest')}
              />
              <ProfileStat value={`${badgesEarned}`} label={t('settings.stats.badges')} />
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(160).springify()} className="mt-8">
            <SectionLabel>{t('settings.journey')}</SectionLabel>
            {statsQuery.isPending || !stats ? (
              <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
                {[0, 1, 2, 3, 4, 5].map((key) => (
                  <SkeletonBlock key={key} className="h-20 w-[31%] rounded-3xl" />
                ))}
              </View>
            ) : (
              <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
                <JourneyStat
                  value={String(stats.daysTracked)}
                  label={t('settings.journeyStats.daysTracked')}
                />
                <JourneyStat
                  value={String(stats.totals.meals)}
                  label={t('settings.journeyStats.meals')}
                />
                <JourneyStat
                  value={String(stats.totals.workouts)}
                  label={t('settings.journeyStats.workouts')}
                />
                <JourneyStat
                  value={String(stats.totals.sleepNights)}
                  label={t('settings.journeyStats.nights')}
                />
                <JourneyStat
                  value={String(stats.totals.measurements)}
                  label={t('settings.journeyStats.measurements')}
                />
                <JourneyStat
                  value={stats.totals.steps.toLocaleString()}
                  label={t('settings.journeyStats.steps')}
                />
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} className="mt-8">
            <SectionLabel>{t('settings.bodyData')}</SectionLabel>
            {user ? (
              <BodyDataForm
                key={user.id}
                birthDate={user.birthDate}
                heightCm={user.heightCm}
                saving={updateMutation.isPending}
                onSave={(input) => updateMutation.mutate(input)}
              />
            ) : null}
            {bmi !== null ? (
              <Text className="mt-3 text-xs text-content-tertiary">{t('settings.bmiHint')}</Text>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).springify()} className="mt-8">
            <SectionLabel>{t('settings.data')}</SectionLabel>
            <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 px-5">
              <DataRow
                icon="document-text-outline"
                title={t('settings.exportPdf')}
                hint={t('settings.exportPdfHint')}
                loading={reportMutation.isPending}
                onPress={() => reportMutation.mutate()}
              />
              <DataRow
                icon="cloud-download-outline"
                title={t('settings.exportData')}
                hint={t('settings.exportDataHint')}
                loading={backupMutation.isPending}
                onPress={() => backupMutation.mutate()}
              />
              <DataRow
                icon="cloud-upload-outline"
                title={t('settings.importData')}
                hint={t('settings.importDataHint')}
                loading={importMutation.isPending}
                onPress={() => importMutation.mutate()}
              />
            </View>
            {reportMutation.isError || backupMutation.isError ? (
              <Text className="mt-2 text-sm text-metric-heart">{t('settings.exportError')}</Text>
            ) : null}
            {importMutation.isError ? (
              <Text className="mt-2 text-sm text-metric-heart">{t('settings.importError')}</Text>
            ) : null}
            {importMutation.data ? <ImportResult counts={importMutation.data} /> : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(280).springify()} className="mt-8 gap-4">
            <SectionLabel>{t('settings.account')}</SectionLabel>
            <AuthTextField
              label={t('settings.name')}
              placeholder={user?.name}
              value={name}
              onChangeText={setName}
            />
            {nameChanged ? (
              <AuthSubmitButton
                label={t('settings.saveName')}
                loading={updateMutation.isPending}
                onPress={() => updateMutation.mutate({ name: name.trim() })}
              />
            ) : null}

            <Text className="mt-2 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('settings.language')}
            </Text>
            <View className="flex-row gap-2">
              {LOCALES.map((locale) => (
                <Chip
                  key={locale}
                  label={t(`settings.locale.${locale}`)}
                  selected={user?.locale === locale}
                  onPress={() => updateMutation.mutate({ locale })}
                />
              ))}
            </View>

            {updateMutation.isError ? (
              <Text className="text-sm text-metric-heart">{t('common.error')}</Text>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).springify()} className="mt-8">
            <SectionLabel>{t('settings.about')}</SectionLabel>
            <View className="mt-3 flex-row items-center gap-4 rounded-3xl border border-black/5 bg-ink-900 p-5">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-ink-800">
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={theme.colors.content.secondary}
                />
              </View>
              <Text className="text-base font-semibold text-content-primary">
                {t('settings.version', { version: appVersion })}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).springify()} className="mt-10 gap-3">
            <PressableScale
              onPress={() => logoutMutation.mutate()}
              accessibilityRole="button"
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-black/5 bg-ink-900 py-4"
            >
              <Ionicons name="log-out-outline" size={18} color={theme.colors.content.primary} />
              <Text className="text-base font-semibold text-content-primary">
                {t('home.logout')}
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => navigation.navigate('DeleteAccount')}
              accessibilityRole="button"
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-metric-heart/30 py-4"
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.metric.heart} />
              <Text className="text-base font-semibold text-metric-heart">
                {t('settings.deleteAccount')}
              </Text>
            </PressableScale>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
