import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { MacroBar } from '../../../components/MacroBar';
import { PressableScale } from '../../../components/PressableScale';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { useLogout } from '../../auth/hooks';
import { formatDelta, isImprovement } from '../../progress/helpers';
import { useBodyProgress, useProgressScore, useTodayPanel } from '../../progress/hooks';
import type { BodyWindow } from '../../progress/types';
import { useAuthStore } from '../../../store/auth';
import { theme } from '../../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subtitleKey: string;
  route:
    | 'Goals'
    | 'Measurements'
    | 'Nutrition'
    | 'Activity'
    | 'Workouts'
    | 'Sleep'
    | 'Insights'
    | 'Achievements';
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'flag-outline', titleKey: 'home.goals', subtitleKey: 'home.goalsHint', route: 'Goals' },
  {
    icon: 'restaurant-outline',
    titleKey: 'home.nutrition',
    subtitleKey: 'home.nutritionHint',
    route: 'Nutrition',
  },
  {
    icon: 'walk-outline',
    titleKey: 'home.activity',
    subtitleKey: 'home.activityHint',
    route: 'Activity',
  },
  {
    icon: 'barbell-outline',
    titleKey: 'home.workouts',
    subtitleKey: 'home.workoutsHint',
    route: 'Workouts',
  },
  { icon: 'moon-outline', titleKey: 'home.sleep', subtitleKey: 'home.sleepHint', route: 'Sleep' },
  {
    icon: 'body-outline',
    titleKey: 'home.measurements',
    subtitleKey: 'home.measurementsHint',
    route: 'Measurements',
  },
  {
    icon: 'sparkles-outline',
    titleKey: 'home.insights',
    subtitleKey: 'home.insightsHint',
    route: 'Insights',
  },
  {
    icon: 'trophy-outline',
    titleKey: 'home.achievements',
    subtitleKey: 'home.achievementsHint',
    route: 'Achievements',
  },
];

const BODY_WINDOWS: BodyWindow[] = ['week', '7d', '30d', '90d'];

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
      className="mt-8 rounded-3xl border border-white/5 bg-ink-900 p-5"
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
        {t('home.progressScore')}
      </Text>
      <View className="mt-1 flex-row items-end justify-between">
        <Text
          className={`text-6xl font-extrabold tracking-tighter ${
            score && score.score > 0 ? 'text-content-primary' : 'text-content-tertiary'
          }`}
        >
          {score?.score ?? 0}
        </Text>
        {score && formatDelta(score.delta) !== null ? (
          <View
            className={`mb-2 rounded-full px-3 py-1 ${
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
      </View>
      {score && score.score === 0 ? (
        <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
          {t('home.emptyHint')}
        </Text>
      ) : null}
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
    <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8">
      <Text className="text-lg font-semibold text-content-primary">{t('home.today')}</Text>
      <View className="mt-3 gap-4 rounded-3xl border border-white/5 bg-ink-900 p-5">
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
    <Animated.View entering={FadeInDown.delay(180).springify()} className="mt-8">
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
        <View className="mt-3 rounded-3xl border border-white/5 bg-ink-900 px-5">
          {bodyQuery.data.metrics.map((metric, index) => (
            <View
              key={metric.key}
              className={`flex-row items-center justify-between py-3.5 ${
                index > 0 ? 'border-t border-white/5' : ''
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
          <View className="flex-row items-center justify-between border-t border-white/5 py-3.5">
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
  const logoutMutation = useLogout();

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
              onPress={() => logoutMutation.mutate()}
              accessibilityRole="button"
              accessibilityLabel={t('home.logout')}
              className="h-11 w-11 items-center justify-center rounded-full bg-ink-800"
            >
              <Ionicons name="log-out-outline" size={22} color={theme.colors.content.secondary} />
            </PressableScale>
          </Animated.View>

          <ScoreHero />
          <TodaySection />
          <BodySection />

          <Animated.View entering={FadeInDown.delay(240).springify()} className="mt-8">
            <Text className="text-lg font-semibold text-content-primary">{t('home.track')}</Text>
            <View className="mt-3 rounded-3xl border border-white/5 bg-ink-900 px-5">
              {QUICK_ACTIONS.map((action, index) => (
                <PressableScale
                  key={action.route}
                  onPress={() => navigation.navigate(action.route)}
                  accessibilityRole="button"
                  className={`flex-row items-center gap-4 py-4 ${
                    index > 0 ? 'border-t border-white/5' : ''
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
