import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { parseDecimal } from '../../goals/helpers';
import { usePutSleepTarget, useSleepTargets } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'SleepTarget'>;

function TargetForm({ initialMinutes, onSaved }: { initialMinutes?: number; onSaved: () => void }) {
  const { t } = useTranslation();
  const putMutation = usePutSleepTarget();
  const [hours, setHours] = useState(
    initialMinutes !== undefined ? String(initialMinutes / 60) : '',
  );

  const parsedHours = parseDecimal(hours);
  const canSubmit = parsedHours !== null && parsedHours >= 1 && parsedHours <= 16;

  const submit = () => {
    if (!canSubmit || parsedHours === null || putMutation.isPending) return;
    putMutation.mutate(Math.round(parsedHours * 60), { onSuccess: onSaved });
  };

  return (
    <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8 gap-4">
      <Text className="text-sm leading-relaxed text-content-secondary">
        {t('sleep.targetHint')}
      </Text>
      <AuthTextField
        label={t('sleep.hoursPerNight')}
        placeholder="8"
        keyboardType="decimal-pad"
        value={hours}
        onChangeText={setHours}
      />
      {putMutation.isError ? (
        <Text className="text-sm text-metric-heart">{t('common.error')}</Text>
      ) : null}
      <View className="mt-4">
        <AuthSubmitButton
          label={t('sleep.saveTarget')}
          loading={putMutation.isPending}
          onPress={submit}
        />
      </View>
    </Animated.View>
  );
}

export function SleepTargetScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const targetsQuery = useSleepTargets();

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('sleep.target')} />
          {targetsQuery.isPending ? (
            <SkeletonBlock className="mt-8 h-14 rounded-2xl" />
          ) : (
            <TargetForm
              {...(targetsQuery.data?.sleep_minutes !== undefined
                ? { initialMinutes: targetsQuery.data.sleep_minutes }
                : {})}
              onSaved={() => navigation.goBack()}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
