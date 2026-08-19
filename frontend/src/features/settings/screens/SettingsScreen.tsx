import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { formatReportDate } from '../report-html';
import { useExportReport, useUpdateProfile } from '../hooks';

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

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateMutation = useUpdateProfile();
  const logoutMutation = useLogout();
  const exportMutation = useExportReport();
  const gamificationQuery = useGamification();
  const [name, setName] = useState(user?.name ?? '');

  const nameChanged = name.trim().length > 0 && name.trim() !== user?.name;
  const streaks = gamificationQuery.data?.streaks;
  const badgesEarned =
    gamificationQuery.data?.badges.filter((badge) => badge.awardedAt !== null).length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('settings.title')} />

          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            className="mt-8 flex-row items-center gap-4 rounded-3xl border border-black/5 bg-ink-900 p-5"
          >
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

          <Animated.View entering={FadeInDown.delay(180).springify()} className="mt-8">
            <SectionLabel>{t('settings.data')}</SectionLabel>
            <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 px-5">
              <PressableScale
                onPress={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('settings.exportPdf')}
                className="flex-row items-center gap-4 py-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft">
                  <Ionicons
                    name="document-text-outline"
                    size={22}
                    color={theme.colors.brand.DEFAULT}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-content-primary">
                    {t('settings.exportPdf')}
                  </Text>
                  <Text className="mt-0.5 text-sm text-content-secondary">
                    {t('settings.exportPdfHint')}
                  </Text>
                </View>
                {exportMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.content.tertiary} />
                ) : (
                  <Ionicons name="share-outline" size={18} color={theme.colors.content.tertiary} />
                )}
              </PressableScale>
            </View>
            {exportMutation.isError ? (
              <Text className="mt-2 text-sm text-metric-heart">{t('settings.exportError')}</Text>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).springify()} className="mt-8 gap-4">
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

          <Animated.View entering={FadeInDown.delay(300).springify()} className="mt-10 gap-3">
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
