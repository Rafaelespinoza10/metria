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
import { useForgotPassword } from '../hooks';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const forgotMutation = useForgotPassword();
  const [email, setEmail] = useState('');

  const canSubmit = email.trim().length > 0;

  const submit = () => {
    if (!canSubmit || forgotMutation.isPending) return;
    forgotMutation.mutate(email.trim().toLowerCase(), {
      onSuccess: () => navigation.navigate('ResetPassword'),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView keyboardShouldPersistTaps="handled" className="flex-1">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('auth.forgotTitle')} />

          <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8 gap-4">
            <Text className="text-sm leading-relaxed text-content-secondary">
              {t('auth.forgotHint')}
            </Text>
            <AuthTextField
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={submit}
            />
          </Animated.View>

          {forgotMutation.isError ? (
            <Text className="mt-4 text-sm text-metric-heart">{t('auth.errors.generic')}</Text>
          ) : null}

          <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8">
            <AuthSubmitButton
              label={t('auth.sendResetCode')}
              loading={forgotMutation.isPending}
              disabled={!canSubmit}
              onPress={submit}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
