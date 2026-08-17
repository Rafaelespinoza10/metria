import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { ApiError } from '../../../services/api';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { formatMinutes, sleepInstants } from '../helpers';
import { useCreateSleep } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'LogSleep'>;

export function LogSleepScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const createMutation = useCreateSleep();
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [quality, setQuality] = useState<number | null>(null);

  const instants = sleepInstants(bedtime, wakeTime);
  const previewMinutes = instants
    ? Math.round((instants.wakeTime.getTime() - instants.bedtime.getTime()) / 60000)
    : null;

  const submit = () => {
    if (!instants || createMutation.isPending) return;
    createMutation.mutate(
      {
        bedtime: instants.bedtime.toISOString(),
        wakeTime: instants.wakeTime.toISOString(),
        ...(quality !== null ? { quality } : {}),
      },
      { onSuccess: () => navigation.goBack() },
    );
  };

  const errorKey =
    createMutation.error instanceof ApiError && createMutation.error.code === 'CONFLICT'
      ? 'sleep.alreadyLogged'
      : 'common.error';

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('sleep.log')} />

          <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8 gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <AuthTextField
                  label={t('sleep.bedtime')}
                  placeholder="23:00"
                  keyboardType="numbers-and-punctuation"
                  value={bedtime}
                  onChangeText={setBedtime}
                />
              </View>
              <View className="flex-1">
                <AuthTextField
                  label={t('sleep.wakeTime')}
                  placeholder="06:34"
                  keyboardType="numbers-and-punctuation"
                  value={wakeTime}
                  onChangeText={setWakeTime}
                />
              </View>
            </View>

            {previewMinutes !== null ? (
              <Text className="text-sm text-content-secondary">
                {t('sleep.durationPreview', { duration: formatMinutes(previewMinutes) })}
              </Text>
            ) : null}

            <Text className="mt-2 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('sleep.quality')}
            </Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Chip
                  key={value}
                  label={String(value)}
                  selected={quality === value}
                  onPress={() => setQuality(quality === value ? null : value)}
                />
              ))}
            </View>

            {createMutation.isError ? (
              <Text className="text-sm text-metric-heart">{t(errorKey)}</Text>
            ) : null}

            <View className="mt-4">
              <AuthSubmitButton
                label={t('sleep.save')}
                loading={createMutation.isPending}
                onPress={submit}
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
