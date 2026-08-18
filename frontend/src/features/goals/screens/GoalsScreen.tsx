import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { goalCategoryKey, goalMetricKey, goalMetricUnit } from '../helpers';
import { useGoals } from '../hooks';
import type { Goal, GoalStatus } from '../types';
import { sectionImages } from '../../../theme/images';

type Props = NativeStackScreenProps<AppStackParamList, 'Goals'>;

const STATUSES: GoalStatus[] = ['active', 'achieved', 'abandoned'];

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const { t } = useTranslation();
  const unit = goalMetricUnit(goal.metric);

  return (
    <Animated.View
      entering={FadeInDown.delay(120 + index * 60).springify()}
      className="mt-3 rounded-3xl border border-black/5 bg-ink-900 p-5"
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
        {t(goalCategoryKey(goal.category))}
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
    </Animated.View>
  );
}

export function GoalsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GoalStatus>('active');
  const goalsQuery = useGoals(status);

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <View className="flex-1 px-5">
        <ScreenHeader showBack title={t('goals.title')} />

        <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-6 flex-row gap-2">
          {STATUSES.map((item) => (
            <Chip
              key={item}
              label={t(`goals.status.${item}`)}
              selected={status === item}
              onPress={() => setStatus(item)}
            />
          ))}
        </Animated.View>

        <ScrollView className="mt-2 flex-1" showsVerticalScrollIndicator={false}>
          {goalsQuery.isPending ? (
            <>
              <SkeletonBlock className="mt-3 h-32 rounded-3xl" />
              <SkeletonBlock className="mt-3 h-32 rounded-3xl" />
            </>
          ) : goalsQuery.data && goalsQuery.data.length > 0 ? (
            goalsQuery.data.map((goal, index) => (
              <GoalCard key={goal.id} goal={goal} index={index} />
            ))
          ) : (
            <Animated.View
              entering={FadeInDown.delay(120).springify()}
              className="mt-3 items-start overflow-hidden rounded-3xl border border-black/5 bg-ink-900"
            >
              <Image
                source={sectionImages.goals}
                className="h-36 w-full bg-ink-800"
                accessibilityIgnoresInvertColors
              />
              <Text className="p-5 text-sm leading-relaxed text-content-secondary">
                {t('goals.empty')}
              </Text>
            </Animated.View>
          )}
          <View className="h-28" />
        </ScrollView>

        <Animated.View
          entering={FadeInDown.delay(180).springify()}
          className="absolute inset-x-5 bottom-6"
        >
          <PressableScale
            onPress={() => navigation.navigate('CreateGoal')}
            accessibilityRole="button"
            className="rounded-2xl bg-charcoal py-4"
          >
            <Text className="text-center text-base font-semibold text-white">
              {t('goals.newGoal')}
            </Text>
          </PressableScale>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
