import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { formatSet, totalSets } from '../helpers';
import { useWorkouts } from '../hooks';
import type { Workout } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'Workouts'>;

function WorkoutCard({ workout, index }: { workout: Workout; index: number }) {
  const { t } = useTranslation();

  return (
    <Animated.View
      entering={FadeInDown.delay(120 + index * 60).springify()}
      className="mt-3 rounded-3xl border border-black/5 bg-ink-900 p-5"
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
          {workout.localDate}
        </Text>
        {workout.durationMinutes !== null ? (
          <Text className="text-xs text-content-secondary">{workout.durationMinutes} min</Text>
        ) : null}
      </View>
      <Text className="mt-2 text-2xl font-bold tracking-tight text-content-primary">
        {workout.name}
      </Text>
      <Text className="mt-1 text-sm text-content-secondary">
        {t('workouts.summary', {
          exercises: workout.exercises.length,
          sets: totalSets(workout.exercises),
        })}
      </Text>
      <View className="mt-3 border-t border-black/5 pt-3">
        {workout.exercises.slice(0, 3).map((exercise) => (
          <View key={exercise.id} className="flex-row items-baseline justify-between py-1">
            <Text className="flex-1 pr-3 text-sm text-content-primary" numberOfLines={1}>
              {exercise.name}
            </Text>
            <Text className="text-xs text-content-secondary">
              {exercise.sets.map((set) => formatSet(set)).join(' · ')}
            </Text>
          </View>
        ))}
        {workout.exercises.length > 3 ? (
          <Text className="mt-1 text-xs text-content-tertiary">
            +{workout.exercises.length - 3}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function WorkoutsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const workoutsQuery = useWorkouts();

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <View className="flex-1 px-5">
        <ScreenHeader showBack title={t('workouts.title')} />

        <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
          {workoutsQuery.isPending ? (
            <>
              <SkeletonBlock className="mt-3 h-40 rounded-3xl" />
              <SkeletonBlock className="mt-3 h-40 rounded-3xl" />
            </>
          ) : workoutsQuery.data && workoutsQuery.data.length > 0 ? (
            workoutsQuery.data.map((workout, index) => (
              <WorkoutCard key={workout.id} workout={workout} index={index} />
            ))
          ) : (
            <Animated.View
              entering={FadeInDown.delay(120).springify()}
              className="mt-3 items-start rounded-3xl border border-black/5 bg-ink-900 p-5"
            >
              <Text className="text-6xl font-extrabold tracking-tighter text-content-tertiary">
                0
              </Text>
              <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
                {t('workouts.empty')}
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
            onPress={() => navigation.navigate('AddWorkout')}
            accessibilityRole="button"
            className="rounded-2xl bg-charcoal py-4"
          >
            <Text className="text-center text-base font-semibold text-white">
              {t('workouts.new')}
            </Text>
          </PressableScale>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
