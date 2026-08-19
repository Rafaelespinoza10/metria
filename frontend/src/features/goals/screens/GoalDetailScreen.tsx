import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../../components/Button';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { goalCategoryKey, goalMetricKey, goalMetricUnit } from '../helpers';
import { useDeleteGoal, useUpdateGoal } from '../hooks';
import type { GoalStatus } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'GoalDetail'>;

export function GoalDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { goal } = route.params;
  const updateMutation = useUpdateGoal();
  const deleteMutation = useDeleteGoal();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const unit = goalMetricUnit(goal.metric);

  const setStatus = (status: GoalStatus) => {
    if (updateMutation.isPending) return;
    updateMutation.mutate(
      { id: goal.id, changes: { status } },
      { onSuccess: () => navigation.goBack() },
    );
  };

  const remove = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteMutation.mutate(goal.id, { onSuccess: () => navigation.goBack() });
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('goals.detailTitle')} />

          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            className="mt-6 rounded-3xl border border-black/5 bg-ink-900 p-5"
          >
            <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t(goalCategoryKey(goal.category))} · {t(`goals.status.${goal.status}`)}
            </Text>
            <Text className="mt-2 text-3xl font-bold tracking-tight text-content-primary">
              {t(goalMetricKey(goal.metric))}
            </Text>
            {goal.targetValue !== null ? (
              <View className="mt-3 flex-row items-baseline gap-2">
                {goal.startValue !== null ? (
                  <Text className="text-sm text-content-secondary">
                    {goal.startValue} {unit} →
                  </Text>
                ) : null}
                <Text className="text-base font-semibold text-brand">
                  {goal.targetValue} {unit}
                </Text>
              </View>
            ) : null}
            {goal.progress ? (
              <View className="mt-4 border-t border-black/5 pt-4">
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-4xl font-extrabold tracking-tighter text-content-primary">
                    {goal.progress.current}
                  </Text>
                  <Text className="text-base font-medium text-content-secondary">
                    {unit} {t('goals.current').toLowerCase()}
                  </Text>
                </View>
                {goal.progress.percent !== null ? (
                  <View className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                    <View
                      className="h-2 rounded-full bg-brand"
                      style={{ width: `${goal.progress.percent}%` }}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Animated.View>

          {updateMutation.isError || deleteMutation.isError ? (
            <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
          ) : null}

          <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8 gap-4">
            {goal.status === 'active' ? (
              <>
                <Button
                  label={t('goals.markAchieved')}
                  loading={updateMutation.isPending}
                  onPress={() => setStatus('achieved')}
                />
                <Button
                  label={t('goals.abandon')}
                  variant="secondary"
                  onPress={() => setStatus('abandoned')}
                />
              </>
            ) : (
              <Button
                label={t('goals.reactivate')}
                variant="secondary"
                loading={updateMutation.isPending}
                onPress={() => setStatus('active')}
              />
            )}
            <Button
              label={t(confirmingDelete ? 'common.confirmDelete' : 'goals.deleteGoal')}
              variant="destructive"
              loading={deleteMutation.isPending}
              onPress={remove}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
