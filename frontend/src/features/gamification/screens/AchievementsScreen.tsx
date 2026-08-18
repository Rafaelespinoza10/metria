import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import { theme } from '../../../theme';
import { useGamification } from '../hooks';
import type { BadgeState } from '../types';

const BADGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  tracking_7_days: 'calendar-outline',
  tracking_30_days: 'calendar-number-outline',
  sleep_goal_7_consecutive: 'moon-outline',
  workouts_10: 'barbell-outline',
  steps_100k_total: 'walk-outline',
  first_measurement_improvement: 'trending-down-outline',
};

function BadgeTile({ badge }: { badge: BadgeState }) {
  const { t } = useTranslation();
  const earned = badge.awardedAt !== null;

  return (
    <View
      className={`w-[48%] rounded-3xl border p-4 ${
        earned ? 'border-brand/40 bg-ink-900' : 'border-black/5 bg-ink-900 opacity-50'
      }`}
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-2xl ${
          earned ? 'bg-brand-soft' : 'bg-ink-800'
        }`}
      >
        <Ionicons
          name={BADGE_ICONS[badge.key] ?? 'ribbon-outline'}
          size={22}
          color={earned ? theme.colors.brand.DEFAULT : theme.colors.content.tertiary}
        />
      </View>
      <Text className="mt-3 text-sm font-semibold text-content-primary">
        {t(`gamification.badge.${badge.key}.title`)}
      </Text>
      <Text className="mt-1 text-xs leading-relaxed text-content-secondary">
        {t(`gamification.badge.${badge.key}.description`)}
      </Text>
    </View>
  );
}

export function AchievementsScreen() {
  const { t } = useTranslation();
  const gamificationQuery = useGamification();
  const state = gamificationQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('gamification.title')} />

          {gamificationQuery.isPending || !state ? (
            <>
              <SkeletonBlock className="mt-8 h-36 rounded-3xl" />
              <SkeletonBlock className="mt-4 h-64 rounded-3xl" />
            </>
          ) : (
            <>
              <Animated.View
                entering={FadeInDown.delay(60).springify()}
                className="mt-8 flex-row gap-3"
              >
                <View className="flex-1 rounded-3xl border border-black/5 bg-ink-900 p-5">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    {t('gamification.trackingStreak')}
                  </Text>
                  <Text
                    className={`mt-1 text-6xl font-extrabold tracking-tighter ${
                      state.streaks.tracking.current > 0
                        ? 'text-content-primary'
                        : 'text-content-tertiary'
                    }`}
                  >
                    {state.streaks.tracking.current}
                  </Text>
                  <Text className="mt-1 text-xs text-content-secondary">
                    {t('gamification.longest', { count: state.streaks.tracking.longest })}
                  </Text>
                </View>
                <View className="flex-1 rounded-3xl border border-black/5 bg-ink-900 p-5">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    {t('gamification.sleepStreak')}
                  </Text>
                  <Text
                    className={`mt-1 text-6xl font-extrabold tracking-tighter ${
                      state.streaks.sleepGoal.current > 0
                        ? 'text-content-primary'
                        : 'text-content-tertiary'
                    }`}
                  >
                    {state.streaks.sleepGoal.current}
                  </Text>
                  <Text className="mt-1 text-xs text-content-secondary">
                    {t('gamification.longest', { count: state.streaks.sleepGoal.longest })}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8">
                <Text className="text-lg font-semibold text-content-primary">
                  {t('gamification.badges')}
                </Text>
                <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
                  {state.badges.map((badge) => (
                    <BadgeTile key={badge.key} badge={badge} />
                  ))}
                </View>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
