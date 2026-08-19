import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AuthStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../components/AuthSubmitButton';
import { AuthTextField } from '../components/AuthTextField';
import { useResetPassword } from '../hooks';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const resetMutation = useResetPassword();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = code.trim().length > 0 && password.length >= 8;

  const submit = () => {
    if (!canSubmit || resetMutation.isPending) return;
    resetMutation.mutate(
      { token: code.trim(), newPassword: password },
      { onSuccess: () => navigation.popToTop() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView keyboardShouldPersistTaps="handled" className="flex-1">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('auth.resetTitle')} />

          <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8 gap-4">
            <Text className="text-sm leading-relaxed text-content-secondary">
              {t('auth.resetHint')}
            </Text>
            <AuthTextField
              label={t('auth.resetCode')}
              placeholder={t('auth.resetCodePlaceholder')}
              autoCapitalize="none"
              value={code}
              onChangeText={setCode}
            />
            <AuthTextField
              label={t('auth.newPassword')}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
            />
          </Animated.View>

          {resetMutation.isError ? (
            <Text className="mt-4 text-sm text-metric-heart">{t('auth.errors.invalidReset')}</Text>
          ) : null}

          <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8">
            <AuthSubmitButton
              label={t('auth.resetAction')}
              loading={resetMutation.isPending}
              disabled={!canSubmit}
              onPress={submit}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
