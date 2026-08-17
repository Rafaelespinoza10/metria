import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MacroBar } from '../../../components/MacroBar';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { addDays, todayISO } from '../../../services/dates';
import { theme } from '../../../theme';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { parseDecimal } from '../../goals/helpers';
import { useActivityEntry, useActivityTargets, usePutActivityEntry } from '../hooks';
import type { ActivityEntry, ActivityTargets } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'Activity'>;

// Mounted per (date, entry) so state initializes from server data without effects.
function DayEditor({
  date,
  entry,
  targets,
}: {
  date: string;
  entry: ActivityEntry;
  targets: ActivityTargets;
}) {
  const { t } = useTranslation();
  const putMutation = usePutActivityEntry(date);
  const [steps, setSteps] = useState(entry.steps > 0 ? String(entry.steps) : '');
  const [minutes, setMinutes] = useState(
    entry.activeMinutes > 0 ? String(entry.activeMinutes) : '',
  );

  const parsedSteps = steps.trim() === '' ? 0 : parseDecimal(steps);
  const parsedMinutes = minutes.trim() === '' ? 0 : parseDecimal(minutes);
  const canSubmit = parsedSteps !== null && parsedMinutes !== null;

  const submit = () => {
    if (!canSubmit || putMutation.isPending) return;
    putMutation.mutate({
      steps: Math.round(parsedSteps ?? 0),
      activeMinutes: Math.round(parsedMinutes ?? 0),
    });
  };

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(80).springify()}
        className="rounded-3xl border border-white/5 bg-ink-900 p-5"
      >
        <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
          {t('activity.steps')}
        </Text>
        <View className="mt-1 flex-row items-baseline gap-2">
          <Text className="text-6xl font-extrabold tracking-tighter text-content-primary">
            {entry.steps.toLocaleString()}
          </Text>
          {targets.steps !== undefined ? (
            <Text className="text-base font-medium text-content-secondary">
              / {targets.steps.toLocaleString()}
            </Text>
          ) : null}
        </View>
        <View className="mt-5">
          <MacroBar
            label={t('activity.activeMinutes')}
            value={entry.activeMinutes}
            target={targets.active_minutes}
            unit="min"
            color={theme.colors.metric.move}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).springify()} className="mt-8 gap-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <AuthTextField
              label={t('activity.steps')}
              placeholder="10000"
              keyboardType="number-pad"
              value={steps}
              onChangeText={setSteps}
            />
          </View>
          <View className="flex-1">
            <AuthTextField
              label={t('activity.activeMinutes')}
              placeholder="45"
              keyboardType="number-pad"
              value={minutes}
              onChangeText={setMinutes}
            />
          </View>
        </View>
        {putMutation.isError ? (
          <Text className="text-sm text-metric-heart">{t('common.error')}</Text>
        ) : null}
        <AuthSubmitButton
          label={t('activity.save')}
          loading={putMutation.isPending}
          onPress={submit}
        />
      </Animated.View>
    </>
  );
}

export function ActivityScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayISO());
  const entryQuery = useActivityEntry(date);
  const targetsQuery = useActivityTargets();
  const isToday = date === todayISO();

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader
            showBack
            title={t('activity.title')}
            right={
              <PressableScale
                onPress={() => navigation.navigate('ActivityTargets')}
                accessibilityRole="button"
                accessibilityLabel={t('activity.targets')}
                className="h-11 w-11 items-center justify-center rounded-full bg-ink-800"
              >
                <Ionicons name="options-outline" size={20} color={theme.colors.content.secondary} />
              </PressableScale>
            }
          />

          <Animated.View
            entering={FadeInDown.delay(40).springify()}
            className="mt-6 flex-row items-center justify-between"
          >
            <PressableScale
              onPress={() => setDate(addDays(date, -1))}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full bg-ink-900"
            >
              <Ionicons name="chevron-back" size={18} color={theme.colors.content.secondary} />
            </PressableScale>
            <Text className="text-sm font-semibold text-content-primary">
              {isToday ? t('activity.today') : date}
            </Text>
            <PressableScale
              onPress={() => setDate(addDays(date, 1))}
              disabled={isToday}
              accessibilityRole="button"
              className={`h-10 w-10 items-center justify-center rounded-full bg-ink-900 ${
                isToday ? 'opacity-40' : ''
              }`}
            >
              <Ionicons name="chevron-forward" size={18} color={theme.colors.content.secondary} />
            </PressableScale>
          </Animated.View>

          <View className="mt-4">
            {entryQuery.isPending || targetsQuery.isPending ? (
              <SkeletonBlock className="h-48 rounded-3xl" />
            ) : entryQuery.data ? (
              <DayEditor
                key={`${date}-${entryQuery.data.steps}-${entryQuery.data.activeMinutes}`}
                date={date}
                entry={entryQuery.data}
                targets={targetsQuery.data ?? {}}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
