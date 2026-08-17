import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { useMeasurementTypes } from '../../measurements/hooks';
import { goalCategoryKey, goalMetricKey, parseDecimal } from '../helpers';
import { useCreateGoal } from '../hooks';
import type { GoalCategory, GoalMetric } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateGoal'>;

const CATEGORIES: GoalCategory[] = ['lose_fat', 'gain_muscle', 'maintain', 'improve_habits'];
const METRICS: GoalMetric[] = [
  'weight',
  'body_fat',
  'calories',
  'protein',
  'carbohydrates',
  'fats',
  'steps',
  'active_minutes',
  'sleep_minutes',
  'workout_frequency',
  'measurement',
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
      {children}
    </Text>
  );
}

export function CreateGoalScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const createGoalMutation = useCreateGoal();
  const typesQuery = useMeasurementTypes();
  const [category, setCategory] = useState<GoalCategory>('lose_fat');
  const [metric, setMetric] = useState<GoalMetric>('weight');
  const [measurementTypeId, setMeasurementTypeId] = useState<string | null>(null);
  const [startValue, setStartValue] = useState('');
  const [targetValue, setTargetValue] = useState('');

  const start = parseDecimal(startValue);
  const target = parseDecimal(targetValue);
  const needsType = metric === 'measurement';
  const canSubmit =
    (!needsType || measurementTypeId !== null) &&
    (startValue === '' || start !== null) &&
    (targetValue === '' || target !== null);

  const submit = () => {
    if (!canSubmit || createGoalMutation.isPending) return;
    createGoalMutation.mutate(
      {
        category,
        metric,
        ...(needsType && measurementTypeId ? { measurementTypeId } : {}),
        ...(start !== null ? { startValue: start } : {}),
        ...(target !== null ? { targetValue: target } : {}),
      },
      { onSuccess: () => navigation.goBack() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('goals.newGoal')} />

          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <SectionLabel>{t('goals.selectCategory')}</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((item) => (
                <Chip
                  key={item}
                  label={t(goalCategoryKey(item))}
                  selected={category === item}
                  onPress={() => setCategory(item)}
                />
              ))}
            </View>

            <SectionLabel>{t('goals.selectMetric')}</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {METRICS.map((item) => (
                <Chip
                  key={item}
                  label={t(goalMetricKey(item))}
                  selected={metric === item}
                  onPress={() => {
                    setMetric(item);
                    if (item !== 'measurement') setMeasurementTypeId(null);
                  }}
                />
              ))}
            </View>

            {needsType ? (
              <>
                <SectionLabel>{t('goals.selectMeasurementType')}</SectionLabel>
                <View className="flex-row flex-wrap gap-2">
                  {(typesQuery.data ?? []).map((type) => (
                    <Chip
                      key={type.id}
                      label={t(`measurements.type.${type.key}`)}
                      selected={measurementTypeId === type.id}
                      onPress={() => setMeasurementTypeId(type.id)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <View className="mt-6 gap-4">
              <AuthTextField
                label={t('goals.startValue')}
                placeholder="82.5"
                keyboardType="decimal-pad"
                value={startValue}
                onChangeText={setStartValue}
              />
              <AuthTextField
                label={t('goals.targetValue')}
                placeholder="78"
                keyboardType="decimal-pad"
                value={targetValue}
                onChangeText={setTargetValue}
              />
            </View>

            {createGoalMutation.isError ? (
              <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
            ) : null}

            <View className="mt-8">
              <AuthSubmitButton
                label={t('goals.create')}
                loading={createGoalMutation.isPending}
                onPress={submit}
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
