import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MacroBar } from '../../../components/MacroBar';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { theme } from '../../../theme';
import { formatMinutes } from '../helpers';
import { useSleepEntries, useSleepTargets } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'Sleep'>;

function QualityDots({ quality }: { quality: number | null }) {
  if (quality === null) return null;
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((dot) => (
        <View
          key={dot}
          className={`h-1.5 w-1.5 rounded-full ${dot <= quality ? 'bg-metric-sleep' : 'bg-black/10'}`}
        />
      ))}
    </View>
  );
}

export function SleepScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const entriesQuery = useSleepEntries();
  const targetsQuery = useSleepTargets();

  const entries = entriesQuery.data ?? [];
  const latest = entries[0];
  const target = targetsQuery.data?.sleep_minutes;

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <View className="flex-1 px-5">
        <ScreenHeader
          showBack
          title={t('sleep.title')}
          right={
            <PressableScale
              onPress={() => navigation.navigate('SleepTarget')}
              accessibilityRole="button"
              accessibilityLabel={t('sleep.target')}
              className="h-11 w-11 items-center justify-center rounded-full bg-ink-800"
            >
              <Ionicons name="options-outline" size={20} color={theme.colors.content.secondary} />
            </PressableScale>
          }
        />

        <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
          {entriesQuery.isPending || targetsQuery.isPending ? (
            <SkeletonBlock className="h-48 rounded-3xl" />
          ) : latest ? (
            <Animated.View
              entering={FadeInDown.delay(80).springify()}
              className="rounded-3xl border border-black/5 bg-ink-900 p-5"
            >
              <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                {t('sleep.lastNight')}
              </Text>
              <View className="mt-1 flex-row items-baseline gap-2">
                <Text className="text-6xl font-extrabold tracking-tighter text-content-primary">
                  {formatMinutes(latest.durationMinutes)}
                </Text>
                {target !== undefined ? (
                  <Text className="text-base font-medium text-content-secondary">
                    / {formatMinutes(target)}
                  </Text>
                ) : null}
              </View>
              <View className="mt-5">
                <MacroBar
                  label={t('sleep.duration')}
                  value={latest.durationMinutes}
                  target={target}
                  unit="min"
                  color={theme.colors.metric.sleep}
                />
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInDown.delay(80).springify()}
              className="items-start rounded-3xl border border-black/5 bg-ink-900 p-5"
            >
              <Text className="text-6xl font-extrabold tracking-tighter text-content-tertiary">
                0h
              </Text>
              <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
                {t('sleep.empty')}
              </Text>
            </Animated.View>
          )}

          {entries.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(140).springify()} className="mt-8">
              <Text className="text-lg font-semibold text-content-primary">
                {t('sleep.recent')}
              </Text>
              <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 px-5">
                {entries.slice(0, 7).map((entry, index) => (
                  <View
                    key={entry.id}
                    className={`flex-row items-center justify-between py-4 ${
                      index > 0 ? 'border-t border-black/5' : ''
                    }`}
                  >
                    <View>
                      <Text className="text-sm text-content-secondary">{entry.localDate}</Text>
                      <View className="mt-1">
                        <QualityDots quality={entry.quality} />
                      </View>
                    </View>
                    <Text className="text-xl font-bold tracking-tight text-content-primary">
                      {formatMinutes(entry.durationMinutes)}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}
          <View className="h-28" />
        </ScrollView>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          className="absolute inset-x-5 bottom-6"
        >
          <PressableScale
            onPress={() => navigation.navigate('LogSleep')}
            accessibilityRole="button"
            className="rounded-2xl bg-charcoal py-4"
          >
            <Text className="text-center text-base font-semibold text-white">{t('sleep.log')}</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
