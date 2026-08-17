import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../../../components/PressableScale';
import type { AppStackParamList } from '../../../navigation/types';
import { useLogout } from '../../auth/hooks';
import { useAuthStore } from '../../../store/auth';
import { theme } from '../../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subtitleKey: string;
  route: 'Goals' | 'Measurements' | 'Nutrition' | 'Activity' | 'Workouts' | 'Sleep' | 'Insights';
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
  {
    icon: 'moon-outline',
    titleKey: 'home.sleep',
    subtitleKey: 'home.sleepHint',
    route: 'Sleep',
  },
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
];

function greetingKey(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'home.goodMorning';
  if (hour < 19) return 'home.goodAfternoon';
  return 'home.goodEvening';
}

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <View className="flex-1 px-5">
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

        <Animated.View
          entering={FadeInDown.delay(60).springify()}
          className="mt-8 rounded-3xl border border-white/5 bg-ink-900 p-5"
        >
          <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
            {t('home.progressScore')}
          </Text>
          <Text className="mt-2 text-6xl font-extrabold tracking-tighter text-content-tertiary">
            0
          </Text>
          <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
            {t('home.emptyHint')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8">
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
                <Ionicons name="chevron-forward" size={18} color={theme.colors.content.tertiary} />
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
