import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { SegmentedArc } from '../../../components/SegmentedArc';
import { MacroBar } from '../../../components/MacroBar';
import { PressableScale } from '../../../components/PressableScale';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import { TrendChart } from '../../../components/TrendChart';
import type { TabScreenProps } from '../../../navigation/types';
import { useGamification } from '../../gamification/hooks';
import { formatCompact, formatMinutes, trendLabels } from '../../progress/chart-helpers';
import { formatDelta, isImprovement } from '../../progress/helpers';
import { useBodyProgress, useProgressScore, useTodayPanel, useTrends } from '../../progress/hooks';
import type { BodyWindow, Trends, TrendsDays, TrendsPoint } from '../../progress/types';
import { useAuthStore } from '../../../store/auth';
import { theme } from '../../../theme';

type Props = TabScreenProps<'Home'>;

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subtitleKey: string;
  route: 'Goals' | 'Measurements' | 'Activity' | 'Sleep' | 'Achievements';
}

// Nutrition, workouts, scanning, and insights live in the tab bar now.
const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'flag-outline', titleKey: 'home.goals', subtitleKey: 'home.goalsHint', route: 'Goals' },
  {
    icon: 'walk-outline',
    titleKey: 'home.activity',
    subtitleKey: 'home.activityHint',
    route: 'Activity',
  },
  { icon: 'moon-outline', titleKey: 'home.sleep', subtitleKey: 'home.sleepHint', route: 'Sleep' },
  {
    icon: 'body-outline',
    titleKey: 'home.measurements',
    subtitleKey: 'home.measurementsHint',
    route: 'Measurements',
  },
  {
    icon: 'trophy-outline',
    titleKey: 'home.achievements',
    subtitleKey: 'home.achievementsHint',
    route: 'Achievements',
  },
];

const BODY_WINDOWS: BodyWindow[] = ['week', '7d', '30d', '90d'];
const TREND_WINDOWS: TrendsDays[] = [7, 14, 30];

type TrendMetric = 'calories' | 'steps' | 'sleep';

interface TrendMetricSpec {
  key: TrendMetric;
  labelKey: string;
  color: string;
  value: (point: TrendsPoint) => number;
  target: (trends: Trends) => number | null;
  average: (trends: Trends) => number | null;
  format: (value: number) => string;
}

const TREND_METRICS: TrendMetricSpec[] = [
  {
    key: 'calories',
    labelKey: 'nutrition.calories',
    color: theme.colors.metric.move,
    value: (point) => point.calories,
    target: (trends) => trends.targets.calories,
    average: (trends) => trends.averages.calories,
    format: formatCompact,
  },
  {
    key: 'steps',
    labelKey: 'activity.steps',
    color: theme.colors.metric.hydro,
    value: (point) => point.steps,
    target: (trends) => trends.targets.steps,
    average: (trends) => trends.averages.steps,
    format: formatCompact,
  },
  {
    key: 'sleep',
    labelKey: 'sleep.title',
    color: theme.colors.metric.sleep,
    value: (point) => point.sleepMinutes,
    target: (trends) => trends.targets.sleepMinutes,
    average: (trends) => trends.averages.sleepMinutes,
    format: formatMinutes,
  },
];

function greetingKey(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'home.goodMorning';
  if (hour < 19) return 'home.goodAfternoon';
  return 'home.goodEvening';
}

function ScoreHero() {
  const { t } = useTranslation();
  const scoreQuery = useProgressScore();

  if (scoreQuery.isPending) return <SkeletonBlock className="mt-8 h-40 rounded-3xl" />;
  const score = scoreQuery.data;

  return (
    <Animated.View
      entering={FadeInDown.delay(60).springify()}
      className="mt-8 items-center rounded-3xl border border-black/5 bg-ink-900 p-5"
    >
      <SegmentedArc ratio={(score?.score ?? 0) / 100}>
        <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
          {t('home.progressScore')}
        </Text>
        <Text
          className={`text-6xl font-extrabold tracking-tighter ${
            score && score.score > 0 ? 'text-content-primary' : 'text-content-tertiary'
          }`}
        >
          {score?.score ?? 0}
        </Text>
      </SegmentedArc>
      {score && formatDelta(score.delta) !== null ? (
        <View
          className={`mt-3 rounded-full px-3 py-1 ${
            score.delta > 0 ? 'bg-brand-soft' : 'bg-ink-800'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              score.delta > 0 ? 'text-brand' : 'text-content-secondary'
            }`}
          >
            {t('home.vsLastWeek', { delta: formatDelta(score.delta) })}
          </Text>
        </View>
      ) : null}
      {score && score.score === 0 ? (
        <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
          {t('home.emptyHint')}
        </Text>
      ) : null}
    </Animated.View>
  );
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  label: string;
}

function StatCard({ icon, color, value, label }: StatCardProps) {
  return (
    <View className="flex-1 rounded-3xl border border-black/5 bg-ink-900 p-4">
      <Ionicons name={icon} size={20} color={color} />
      <Text className="mt-2 text-3xl font-bold tracking-tight text-content-primary">{value}</Text>
      <Text className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
        {label}
      </Text>
    </View>
  );
}

function StatRow() {
  const { t } = useTranslation();
  const gamificationQuery = useGamification();
  const weekQuery = useBodyProgress('week');
  const todayQuery = useTodayPanel();

  if (gamificationQuery.isPending || weekQuery.isPending || todayQuery.isPending) {
    return (
      <View className="mt-3 flex-row gap-3">
        <SkeletonBlock className="h-28 flex-1 rounded-3xl" />
        <SkeletonBlock className="h-28 flex-1 rounded-3xl" />
        <SkeletonBlock className="h-28 flex-1 rounded-3xl" />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(90).springify()} className="mt-3 flex-row gap-3">
      <StatCard
        icon="flame-outline"
        color={theme.colors.brand.DEFAULT}
        value={`${gamificationQuery.data?.streaks.tracking.current ?? 0}`}
        label={t('home.streak')}
      />
      <StatCard
        icon="barbell-outline"
        color={theme.colors.metric.heart}
        value={`${weekQuery.data?.workouts.current ?? 0}`}
        label={t('home.workoutsWeek')}
      />
      <StatCard
        icon="pulse-outline"
        color={theme.colors.metric.hydro}
        value={`${todayQuery.data?.activeMinutes.value ?? 0}`}
        label={t('home.activeToday')}
      />
    </Animated.View>
  );
}

function TrendsSection() {
  const { t } = useTranslation();
  const [metricKey, setMetricKey] = useState<TrendMetric>('calories');
  const [days, setDays] = useState<TrendsDays>(7);
  const trendsQuery = useTrends(days);

  const metric = TREND_METRICS.find((candidate) => candidate.key === metricKey) ?? TREND_METRICS[0];
  const trends = trendsQuery.data;
  const average = trends ? metric.average(trends) : null;
  const target = trends ? metric.target(trends) : null;
  const hasAnyLog = trends?.series.some((point) => point.tracked) ?? false;

  return (
    <Animated.View entering={FadeInDown.delay(150).springify()} className="mt-8">
      <View className="flex-row items-end justify-between">
        <Text className="text-lg font-semibold text-content-primary">{t('home.trends')}</Text>
        <View className="flex-row gap-2">
          {TREND_WINDOWS.map((item) => (
            <Chip
              key={item}
              label={t(`home.trendWindow.${item}`)}
              selected={days === item}
              onPress={() => setDays(item)}
            />
          ))}
        </View>
      </View>
      <View className="mt-3 flex-row gap-2">
        {TREND_METRICS.map((item) => (
          <Chip
            key={item.key}
            label={t(item.labelKey)}
            selected={metricKey === item.key}
            onPress={() => setMetricKey(item.key)}
          />
        ))}
      </View>
      {trendsQuery.isPending || !trends ? (
        <SkeletonBlock className="mt-3 h-56 rounded-3xl" />
      ) : (
        <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 p-5">
          <View className="flex-row items-baseline gap-2">
            <Text className="text-3xl font-bold tracking-tight text-content-primary">
              {average !== null ? metric.format(average) : '—'}
            </Text>
            <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('home.average')}
            </Text>
          </View>
          <View className="mt-4">
            <TrendChart
              values={trends.series.map(metric.value)}
              labels={trendLabels(
                trends.series.map((point) => point.date),
                t('home.dayInitials'),
              )}
              target={target}
              color={metric.color}
            />
          </View>
          {target !== null ? (
            <Text className="mt-3 text-xs text-content-tertiary">
              - - {t('home.target')} {metric.format(target)}
            </Text>
          ) : null}
          {!hasAnyLog ? (
            <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
              {t('home.trendsEmpty')}
            </Text>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

function TodaySection() {
  const { t } = useTranslation();
  const todayQuery = useTodayPanel();

  if (todayQuery.isPending) return <SkeletonBlock className="mt-8 h-56 rounded-3xl" />;
  const today = todayQuery.data;
  if (!today) return null;

  return (
    <Animated.View entering={FadeInDown.delay(210).springify()} className="mt-8">
      <Text className="text-lg font-semibold text-content-primary">{t('home.today')}</Text>
      <View className="mt-3 gap-4 rounded-3xl border border-black/5 bg-ink-900 p-5">
        <MacroBar
          label={t('nutrition.calories')}
          value={Math.round(today.calories.value)}
          target={today.calories.target ?? undefined}
          unit="kcal"
          color={theme.colors.metric.move}
        />
        <MacroBar
          label={t('nutrition.protein')}
          value={Math.round(today.protein.value)}
          target={today.protein.target ?? undefined}
          unit="g"
          color={theme.colors.metric.protein}
        />
        <MacroBar
          label={t('activity.steps')}
          value={today.steps.value}
          target={today.steps.target ?? undefined}
          unit=""
          color={theme.colors.metric.hydro}
        />
        <MacroBar
          label={t('sleep.title')}
          value={today.sleepMinutes.value}
          target={today.sleepMinutes.target ?? undefined}
          unit="min"
          color={theme.colors.metric.sleep}
        />
      </View>
    </Animated.View>
  );
}

function BodySection() {
  const { t } = useTranslation();
  const [window, setWindow] = useState<BodyWindow>('week');
  const bodyQuery = useBodyProgress(window);

  return (
    <Animated.View entering={FadeInDown.delay(270).springify()} className="mt-8">
      <Text className="text-lg font-semibold text-content-primary">{t('home.bodyProgress')}</Text>
      <View className="mt-3 flex-row gap-2">
        {BODY_WINDOWS.map((item) => (
          <Chip
            key={item}
            label={t(`home.window.${item}`)}
            selected={window === item}
            onPress={() => setWindow(item)}
          />
        ))}
      </View>
      {bodyQuery.isPending ? (
        <SkeletonBlock className="mt-3 h-40 rounded-3xl" />
      ) : bodyQuery.data ? (
        <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 px-5">
          {bodyQuery.data.metrics.map((metric, index) => (
            <View
              key={metric.key}
              className={`flex-row items-center justify-between py-3.5 ${
                index > 0 ? 'border-t border-black/5' : ''
              }`}
            >
              <Text className="text-sm text-content-secondary">
                {t(`measurements.type.${metric.key}`)}
              </Text>
              <Text
                className={`text-base font-bold ${
                  metric.delta === null
                    ? 'text-content-tertiary'
                    : isImprovement(metric.delta)
                      ? 'text-brand'
                      : 'text-content-primary'
                }`}
              >
                {formatDelta(metric.delta, metric.unit) ?? '—'}
              </Text>
            </View>
          ))}
          <View className="flex-row items-center justify-between border-t border-black/5 py-3.5">
            <Text className="text-sm text-content-secondary">{t('home.workoutCount')}</Text>
            <Text className="text-base font-bold text-content-primary">
              {bodyQuery.data.workouts.current}
              <Text className="text-xs font-medium text-content-tertiary">
                {'  '}
                {t('home.prevWindow', { count: bodyQuery.data.workouts.previous })}
              </Text>
            </Text>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-12">
          <Animated.View
            entering={FadeInDown.springify()}
            className="mt-2 flex-row items-center justify-between"
          >
            <View>
              <Text className="text-sm text-content-secondary">{t(greetingKey(new Date()))}</Text>
              <Text className="mt-1 text-3xl font-bold text-content-primary">{user?.name}</Text>
            </View>
            <PressableScale
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel={t('settings.title')}
              className="h-11 w-11 items-center justify-center rounded-full bg-ink-800"
            >
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={theme.colors.content.secondary}
              />
            </PressableScale>
          </Animated.View>

          <ScoreHero />
          <StatRow />
          <TrendsSection />
          <TodaySection />
          <BodySection />

          <Animated.View entering={FadeInDown.delay(330).springify()} className="mt-8">
            <Text className="text-lg font-semibold text-content-primary">{t('home.track')}</Text>
            <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 px-5">
              {QUICK_ACTIONS.map((action, index) => (
                <PressableScale
                  key={action.route}
                  onPress={() => navigation.navigate(action.route)}
                  accessibilityRole="button"
                  className={`flex-row items-center gap-4 py-4 ${
                    index > 0 ? 'border-t border-black/5' : ''
                  }`}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft">
                    <Ionicons name={action.icon} size={22} color={theme.colors.brand.DEFAULT} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-content-primary">
                      {t(action.titleKey)}
                    </Text>
                    <Text className="mt-0.5 text-sm text-content-secondary">
                      {t(action.subtitleKey)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.content.tertiary}
                  />
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
