import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import { theme } from '../../../theme';
import { formatMinutes } from '../../sleep/helpers';
import { useDailyInsight, useWeeklyInsight } from '../hooks';
import type { WeekSummary } from '../types';

function delta(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  if (diff === 0) return null;
  return diff > 0 ? `+${diff}` : String(diff);
}

function WeekNumbers({ current, previous }: { current: WeekSummary; previous: WeekSummary }) {
  const { t } = useTranslation();
  const rows: { label: string; value: string; change: string | null }[] = [
    {
      label: t('insights.avgSteps'),
      value: current.avgSteps !== null ? current.avgSteps.toLocaleString() : '—',
      change: delta(current.avgSteps, previous.avgSteps),
    },
    {
      label: t('insights.avgSleep'),
      value: current.avgSleepMinutes !== null ? formatMinutes(current.avgSleepMinutes) : '—',
      change:
        current.avgSleepMinutes !== null && previous.avgSleepMinutes !== null
          ? `${current.avgSleepMinutes - previous.avgSleepMinutes > 0 ? '+' : ''}${Math.round(
              current.avgSleepMinutes - previous.avgSleepMinutes,
            )}m`
          : null,
    },
    {
      label: t('insights.proteinGoal'),
      value: current.proteinGoalCompletion !== null ? `${current.proteinGoalCompletion}%` : '—',
      change:
        current.proteinGoalCompletion !== null && previous.proteinGoalCompletion !== null
          ? `${
              current.proteinGoalCompletion - previous.proteinGoalCompletion > 0 ? '+' : ''
            }${current.proteinGoalCompletion - previous.proteinGoalCompletion}%`
          : null,
    },
    {
      label: t('insights.workouts'),
      value: String(current.workouts),
      change: delta(current.workouts, previous.workouts),
    },
  ];

  return (
    <View className="mt-4 border-t border-black/5">
      {rows.map((row) => (
        <View key={row.label} className="flex-row items-center justify-between py-2.5">
          <Text className="text-sm text-content-secondary">{row.label}</Text>
          <View className="flex-row items-baseline gap-2">
            <Text className="text-base font-bold text-content-primary">{row.value}</Text>
            {row.change !== null ? (
              <Text className="text-xs font-semibold text-brand">{row.change}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function InsightCard({
  kicker,
  content,
  pending,
  unavailable,
  children,
  delay,
}: {
  kicker: string;
  content?: string | undefined;
  pending: boolean;
  unavailable: boolean;
  children?: React.ReactNode;
  delay: number;
}) {
  const { t } = useTranslation();

  if (pending) return <SkeletonBlock className="mt-4 h-44 rounded-3xl" />;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      className="mt-4 rounded-3xl border border-black/5 bg-ink-900 p-5"
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles-outline" size={14} color={theme.colors.brand.DEFAULT} />
        <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
          {kicker}
        </Text>
      </View>
      {unavailable ? (
        <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
          {t('insights.unavailable')}
        </Text>
      ) : (
        <>
          <Text className="mt-3 text-base leading-relaxed text-content-primary">{content}</Text>
          {children}
          <Text className="mt-4 text-xs text-content-tertiary">{t('insights.disclaimer')}</Text>
        </>
      )}
    </Animated.View>
  );
}

export function InsightsScreen() {
  const { t } = useTranslation();
  const dailyQuery = useDailyInsight();
  const weeklyQuery = useWeeklyInsight();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ type: 'active' });
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        <View className="px-5 pb-12">
          <ScreenHeader title={t('insights.title')} />

          <InsightCard
            kicker={t('insights.daily')}
            content={dailyQuery.data?.content}
            pending={dailyQuery.isPending}
            unavailable={dailyQuery.isError}
            delay={60}
          />

          <InsightCard
            kicker={t('insights.weekly')}
            content={weeklyQuery.data?.content}
            pending={weeklyQuery.isPending}
            unavailable={weeklyQuery.isError}
            delay={120}
          >
            {weeklyQuery.data ? (
              <WeekNumbers
                current={weeklyQuery.data.aggregates.current}
                previous={weeklyQuery.data.aggregates.previous}
              />
            ) : null}
          </InsightCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
