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
import { useActivityTargets, usePutActivityTargets } from '../hooks';
import type { ActivityTargets } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'ActivityTargets'>;

function TargetsForm({ initial, onSaved }: { initial: ActivityTargets; onSaved: () => void }) {
  const { t } = useTranslation();
  const putMutation = usePutActivityTargets();
  const [steps, setSteps] = useState(initial.steps?.toString() ?? '');
  const [minutes, setMinutes] = useState(initial.active_minutes?.toString() ?? '');

  const parsedSteps = steps.trim() === '' ? undefined : parseDecimal(steps);
  const parsedMinutes = minutes.trim() === '' ? undefined : parseDecimal(minutes);
  const provided = [parsedSteps, parsedMinutes].filter((value) => value !== undefined);
  const canSubmit = provided.length > 0 && provided.every((value) => value !== null);

  const submit = () => {
    if (!canSubmit || putMutation.isPending) return;
    putMutation.mutate(
      {
        ...(parsedSteps != null ? { steps: Math.round(parsedSteps) } : {}),
        ...(parsedMinutes != null ? { activeMinutes: Math.round(parsedMinutes) } : {}),
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8 gap-4">
      <Text className="text-sm leading-relaxed text-content-secondary">
        {t('activity.targetsHint')}
      </Text>
      <AuthTextField
        label={t('activity.stepsTarget')}
        placeholder="10000"
        keyboardType="number-pad"
        value={steps}
        onChangeText={setSteps}
      />
      <AuthTextField
        label={t('activity.minutesTarget')}
        placeholder="45"
        keyboardType="number-pad"
        value={minutes}
        onChangeText={setMinutes}
      />
      {putMutation.isError ? (
        <Text className="text-sm text-metric-heart">{t('common.error')}</Text>
      ) : null}
      <View className="mt-4">
        <AuthSubmitButton
          label={t('activity.saveTargets')}
          loading={putMutation.isPending}
          onPress={submit}
        />
      </View>
    </Animated.View>
  );
}

export function ActivityTargetsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const targetsQuery = useActivityTargets();

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('activity.targets')} />
          {targetsQuery.isPending ? (
            <View className="mt-8 gap-4">
              <SkeletonBlock className="h-14 rounded-2xl" />
              <SkeletonBlock className="h-14 rounded-2xl" />
            </View>
          ) : (
            <TargetsForm initial={targetsQuery.data ?? {}} onSaved={() => navigation.goBack()} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
