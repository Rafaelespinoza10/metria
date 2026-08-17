import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../../../components/PressableScale';
import { useLogout } from '../../auth/hooks';
import { useAuthStore } from '../../../store/auth';
import { theme } from '../../../theme';

function greetingKey(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'home.goodMorning';
  if (hour < 19) return 'home.goodAfternoon';
  return 'home.goodEvening';
}

export function HomeScreen() {
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
      </View>
    </SafeAreaView>
  );
}
