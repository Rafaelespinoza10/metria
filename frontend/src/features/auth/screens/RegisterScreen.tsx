import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AuthStackParamList } from '../../../navigation/types';
import { sectionImages } from '../../../theme/images';
import { AuthSubmitButton } from '../components/AuthSubmitButton';
import { AuthTextField } from '../components/AuthTextField';
import { authErrorKey } from '../error-message';
import { useRegister } from '../hooks';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const registerMutation = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 8;

  const submit = () => {
    if (!canSubmit || registerMutation.isPending) return;
    registerMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView keyboardShouldPersistTaps="handled" className="flex-1">
          <View className="px-5 pb-12">
            <Animated.View entering={FadeInDown.springify()} className="mt-4">
              <Image
                source={sectionImages.authHero}
                className="h-40 w-full rounded-3xl bg-ink-800"
                accessibilityIgnoresInvertColors
              />
              <Text className="mt-6 text-xs font-semibold uppercase tracking-widest text-brand">
                {t('common.appName')}
              </Text>
              <Text className="mt-3 text-sm text-content-secondary">
                {t('auth.registerKicker')}
              </Text>
              <Text className="mt-1 text-3xl font-bold text-content-primary">
                {t('auth.registerTitle')}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8 gap-4">
              <AuthTextField
                label={t('auth.name')}
                placeholder={t('auth.namePlaceholder')}
                autoComplete="name"
                value={name}
                onChangeText={setName}
              />
              <AuthTextField
                label={t('auth.email')}
                placeholder={t('auth.emailPlaceholder')}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <AuthTextField
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submit}
              />
            </Animated.View>

            {registerMutation.isError ? (
              <Animated.View entering={FadeInDown.springify()}>
                <Text className="mt-4 text-sm text-metric-heart">
                  {t(authErrorKey(registerMutation.error))}
                </Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8">
              <AuthSubmitButton
                label={t('auth.createAccount')}
                loading={registerMutation.isPending}
                onPress={submit}
              />
              <View className="mt-6 flex-row items-center gap-1.5">
                <Text className="text-sm text-content-secondary">{t('auth.haveAccount')}</Text>
                <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
                  <Text className="text-sm font-semibold text-brand">{t('auth.signIn')}</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
