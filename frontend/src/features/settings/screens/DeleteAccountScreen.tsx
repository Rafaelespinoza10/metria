import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { usePermanentDeleteAccount, useSoftDeleteAccount } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'DeleteAccount'>;

export function DeleteAccountScreen(_props: Props) {
  const { t } = useTranslation();
  const softDeleteMutation = useSoftDeleteAccount();
  const permanentMutation = usePermanentDeleteAccount();
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('settings.deleteAccount')} />

          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            className="mt-8 rounded-3xl border border-white/5 bg-ink-900 p-5"
          >
            <Text className="text-base font-semibold text-content-primary">
              {t('settings.deactivateTitle')}
            </Text>
            <Text className="mt-2 text-sm leading-relaxed text-content-secondary">
              {t('settings.deactivateHint')}
            </Text>
            <PressableScale
              onPress={() => softDeleteMutation.mutate()}
              disabled={softDeleteMutation.isPending}
              accessibilityRole="button"
              className="mt-4 rounded-2xl border border-white/10 py-3.5"
            >
              <Text className="text-center text-sm font-semibold text-content-primary">
                {t('settings.deactivateAction')}
              </Text>
            </PressableScale>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(120).springify()}
            className="mt-6 rounded-3xl border border-metric-heart/30 bg-ink-900 p-5"
          >
            <Text className="text-base font-semibold text-metric-heart">
              {t('settings.permanentTitle')}
            </Text>
            <Text className="mt-2 text-sm leading-relaxed text-content-secondary">
              {t('settings.permanentHint')}
            </Text>
            <View className="mt-4">
              <AuthTextField
                label={t('auth.password')}
                placeholder={t('settings.passwordConfirm')}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            {permanentMutation.isError ? (
              <Text className="mt-3 text-sm text-metric-heart">
                {t('auth.errors.invalidCredentials')}
              </Text>
            ) : null}
            <PressableScale
              onPress={() => permanentMutation.mutate(password)}
              disabled={password.length === 0 || permanentMutation.isPending}
              accessibilityRole="button"
              className={`mt-4 rounded-2xl bg-metric-heart py-3.5 ${
                password.length === 0 ? 'opacity-40' : ''
              }`}
            >
              <Text className="text-center text-sm font-semibold text-ink-950">
                {t('settings.permanentAction')}
              </Text>
            </PressableScale>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
