import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { useAuthStore } from '../../../store/auth';
import { theme } from '../../../theme';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { useLogout } from '../../auth/hooks';
import { useUpdateProfile } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'Settings'>;

const LOCALES = ['en', 'es'] as const;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateMutation = useUpdateProfile();
  const logoutMutation = useLogout();
  const [name, setName] = useState(user?.name ?? '');

  const nameChanged = name.trim().length > 0 && name.trim() !== user?.name;

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('settings.title')} />

          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            className="mt-8 rounded-3xl border border-white/5 bg-ink-900 p-5"
          >
            <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('settings.profile')}
            </Text>
            <Text className="mt-2 text-2xl font-bold tracking-tight text-content-primary">
              {user?.name}
            </Text>
            <Text className="mt-0.5 text-sm text-content-secondary">{user?.email}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-6 gap-4">
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

          <Animated.View entering={FadeInDown.delay(180).springify()} className="mt-10 gap-3">
            <PressableScale
              onPress={() => logoutMutation.mutate()}
              accessibilityRole="button"
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-white/5 bg-ink-900 py-4"
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
