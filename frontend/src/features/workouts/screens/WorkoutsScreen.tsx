import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthedImage } from '../../../components/AuthedImage';
import { ErrorState } from '../../../components/ErrorState';
import { Chip } from '../../../components/Chip';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { TabScreenProps } from '../../../navigation/types';
import { theme } from '../../../theme';
import { sectionImages } from '../../../theme/images';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { addDays, todayISO } from '../../../services/dates';
import { firstExerciseImageUrl, formatSet, totalSets, weeklySummary } from '../helpers';
import { useWeeklyWorkouts, useWorkoutsPages } from '../hooks';
import type { Workout, WorkoutExercise } from '../types';

type Props = TabScreenProps<'Workouts'>;

function WeeklyHero({ workouts }: { workouts: Workout[] }) {
  const { t } = useTranslation();
  const summary = weeklySummary(workouts, new Date());

  return (
    <Animated.View
      entering={FadeInDown.delay(60).springify()}
      className="mt-3 rounded-3xl border border-black/5 bg-ink-900 p-5"
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
        {t('workouts.weekKicker')}
      </Text>
      <View className="mt-1 flex-row items-baseline gap-2">
        <Text className="text-6xl font-extrabold tracking-tighter text-content-primary">
          {summary.workouts}
        </Text>
        <Text className="text-base font-medium text-content-secondary">
          {t('workouts.weekWorkouts')}
        </Text>
      </View>
      <View className="mt-4 flex-row border-t border-black/5 pt-4">
        <View className="flex-1 flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full bg-metric-move" />
          <Text className="text-lg font-bold text-content-primary">{summary.sets}</Text>
          <Text className="text-xs text-content-secondary">{t('workouts.weekSets')}</Text>
        </View>
        <View className="flex-1 flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full bg-metric-hydro" />
          <Text className="text-lg font-bold text-content-primary">{summary.minutes}</Text>
          <Text className="text-xs text-content-secondary">{t('workouts.weekMinutes')}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function ExerciseRow({ exercise }: { exercise: WorkoutExercise }) {
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      {exercise.imageUrl ? (
        <AuthedImage url={exercise.imageUrl} className="h-9 w-9 rounded-xl bg-ink-800" />
      ) : (
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-soft">
          <Ionicons name="barbell-outline" size={16} color={theme.colors.brand.DEFAULT} />
        </View>
      )}
      <Text className="flex-1 pr-3 text-sm text-content-primary" numberOfLines={1}>
        {exercise.name}
      </Text>
      <Text className="text-xs text-content-secondary">
        {exercise.sets.map((set) => formatSet(set)).join(' · ')}
      </Text>
    </View>
  );
}

function WorkoutCard({
  workout,
  index,
  onPress,
}: {
  workout: Workout;
  index: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const photoUrl = firstExerciseImageUrl(workout);
  const muscleGroups = [
    ...new Set(
      workout.exercises
        .map((exercise) => exercise.muscleGroup)
        .filter((group): group is string => group !== null),
    ),
  ].slice(0, 3);

  return (
    <Animated.View entering={FadeInDown.delay(120 + Math.min(index, 5) * 60).springify()}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        className="mt-3 overflow-hidden rounded-3xl border border-black/5 bg-ink-900"
      >
        {photoUrl ? (
          <AuthedImage url={photoUrl} className="h-24 w-full bg-ink-800" />
        ) : (
          <Image
            source={index % 2 === 0 ? sectionImages.goals : sectionImages.workout}
            className="h-24 w-full bg-ink-800"
            accessibilityIgnoresInvertColors
          />
        )}
        <View className="p-5 pt-4">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {workout.localDate}
            </Text>
            {workout.durationMinutes !== null ? (
              <View className="rounded-full bg-ink-800 px-2.5 py-1">
                <Text className="text-xs font-semibold text-content-secondary">
                  {workout.durationMinutes} min
                </Text>
              </View>
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
          {muscleGroups.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {muscleGroups.map((group) => (
                <View key={group} className="rounded-full bg-brand-soft px-3 py-1">
                  <Text className="text-xs font-semibold text-brand">{group}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View className="mt-3 border-t border-black/5 pt-2">
            {workout.exercises.slice(0, 3).map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} />
            ))}
            {workout.exercises.length > 3 ? (
              <Text className="mt-1 text-xs text-content-tertiary">
                +{workout.exercises.length - 3}
              </Text>
            ) : null}
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const RANGES = [
  { key: 'all', days: null },
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
] as const;

export function WorkoutsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [rangeDays, setRangeDays] = useState<number | null>(null);
  const search = useDeferredValue(searchText.trim());
  const weeklyQuery = useWeeklyWorkouts();
  const pagesQuery = useWorkoutsPages({
    ...(rangeDays !== null ? { from: addDays(todayISO(), -(rangeDays - 1)) } : {}),
    ...(search ? { search } : {}),
  });

  const workouts = pagesQuery.data?.pages.flatMap((page) => page.workouts) ?? [];
  const total = pagesQuery.data?.pages[0]?.total ?? 0;
  const filtering = search !== '' || rangeDays !== null;

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <View className="flex-1 px-5">
        <ScreenHeader
          title={t('workouts.title')}
          right={
            <PressableScale
              onPress={() => navigation.navigate('ExerciseBrowser', {})}
              accessibilityRole="button"
              accessibilityLabel={t('exercises.title')}
              className="h-11 w-11 items-center justify-center rounded-full bg-ink-900"
            >
              <Ionicons name="body-outline" size={20} color={theme.colors.brand.DEFAULT} />
            </PressableScale>
          }
        />

        <FlatList
          className="mt-4 flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          data={pagesQuery.isPending ? [] : workouts}
          keyExtractor={(workout) => workout.id}
          renderItem={({ item, index }) => (
            <WorkoutCard
              workout={item}
              index={index}
              onPress={() => navigation.navigate('WorkoutDetail', { id: item.id })}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (pagesQuery.hasNextPage && !pagesQuery.isFetchingNextPage) {
              void pagesQuery.fetchNextPage();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={pagesQuery.isRefetching && !pagesQuery.isFetchingNextPage}
              onRefresh={() => {
                void pagesQuery.refetch();
                void weeklyQuery.refetch();
              }}
            />
          }
          ListHeaderComponent={
            <>
              {weeklyQuery.data && weeklyQuery.data.length > 0 ? (
                <WeeklyHero workouts={weeklyQuery.data} />
              ) : null}

              <Animated.View entering={FadeInDown.delay(90).springify()} className="mt-4">
                <AuthTextField
                  label={t('workouts.searchLabel')}
                  placeholder={t('workouts.searchPlaceholder')}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                />
                <View className="mt-3 flex-row gap-2">
                  {RANGES.map((range) => (
                    <Chip
                      key={range.key}
                      label={t(`workouts.range.${range.key}`)}
                      selected={rangeDays === range.days}
                      onPress={() => setRangeDays(range.days)}
                    />
                  ))}
                </View>
                {filtering && !pagesQuery.isPending ? (
                  <Text className="mt-3 text-xs text-content-tertiary">
                    {t('workouts.results', { count: total })}
                  </Text>
                ) : null}
              </Animated.View>

              {pagesQuery.isPending ? (
                <>
                  <SkeletonBlock className="mt-3 h-52 rounded-3xl" />
                  <SkeletonBlock className="mt-3 h-52 rounded-3xl" />
                </>
              ) : null}
              {pagesQuery.isError ? <ErrorState onRetry={() => void pagesQuery.refetch()} /> : null}
            </>
          }
          ListEmptyComponent={
            pagesQuery.isPending || pagesQuery.isError ? null : filtering ? (
              <Text className="mt-6 text-sm leading-relaxed text-content-secondary">
                {t('workouts.noResults')}
              </Text>
            ) : (
              <Animated.View
                entering={FadeInDown.delay(120).springify()}
                className="mt-3 items-start overflow-hidden rounded-3xl border border-black/5 bg-ink-900"
              >
                <Image
                  source={sectionImages.workout}
                  className="h-36 w-full bg-ink-800"
                  accessibilityIgnoresInvertColors
                />
                <Text className="p-5 text-sm leading-relaxed text-content-secondary">
                  {t('workouts.empty')}
                </Text>
              </Animated.View>
            )
          }
          ListFooterComponent={
            <View className="h-28 items-center justify-start pt-4">
              {pagesQuery.isFetchingNextPage ? <ActivityIndicator /> : null}
            </View>
          }
        />

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
