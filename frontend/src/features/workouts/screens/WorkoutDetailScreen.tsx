import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthedImage } from '../../../components/AuthedImage';
import { Button } from '../../../components/Button';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { theme } from '../../../theme';
import { sectionImages } from '../../../theme/images';
import { firstExerciseImageUrl, formatSet, totalSets, totalVolume } from '../helpers';
import { useDeleteWorkout, useWorkout } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'WorkoutDetail'>;

export function WorkoutDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const workoutQuery = useWorkout(route.params.id);
  const deleteMutation = useDeleteWorkout();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const workout = workoutQuery.data;
  const heroUrl = workout ? firstExerciseImageUrl(workout) : null;

  const remove = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteMutation.mutate(route.params.id, { onSuccess: () => navigation.goBack() });
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('workouts.detailTitle')} />

          {workoutQuery.isPending || !workout ? (
            <>
              <SkeletonBlock className="mt-6 h-44 rounded-3xl" />
              <SkeletonBlock className="mt-4 h-64 rounded-3xl" />
            </>
          ) : (
            <>
              <Animated.View
                entering={FadeInDown.delay(40).springify()}
                className="mt-6 overflow-hidden rounded-3xl border border-black/5 bg-ink-900"
              >
                {heroUrl ? (
                  <AuthedImage url={heroUrl} className="h-40 w-full bg-ink-800" />
                ) : (
                  <Image
                    source={sectionImages.workout}
                    className="h-40 w-full bg-ink-800"
                    accessibilityIgnoresInvertColors
                  />
                )}
                <View className="p-5">
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
                  <Text className="mt-2 text-3xl font-bold tracking-tight text-content-primary">
                    {workout.name}
                  </Text>
                  <View className="mt-4 flex-row border-t border-black/5 pt-4">
                    {[
                      {
                        label: t('workouts.exercisesLabel'),
                        value: String(workout.exercises.length),
                      },
                      {
                        label: t('workouts.setsLabel'),
                        value: String(totalSets(workout.exercises)),
                      },
                      {
                        label: t('workouts.volumeLabel'),
                        value: totalVolume(workout.exercises).toLocaleString(),
                      },
                    ].map((stat) => (
                      <View key={stat.label} className="flex-1 items-center">
                        <Text className="text-2xl font-bold tracking-tight text-content-primary">
                          {stat.value}
                        </Text>
                        <Text className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                          {stat.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>

              {workout.exercises.map((exercise, index) => (
                <Animated.View
                  key={exercise.id}
                  entering={FadeInDown.delay(100 + index * 50).springify()}
                  className="mt-4 rounded-3xl border border-black/5 bg-ink-900 p-5"
                >
                  <View className="flex-row items-center gap-3">
                    {exercise.imageUrl ? (
                      <AuthedImage
                        url={exercise.imageUrl}
                        className="h-12 w-12 rounded-2xl bg-ink-800"
                      />
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
                        <Ionicons
                          name="barbell-outline"
                          size={20}
                          color={theme.colors.brand.DEFAULT}
                        />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-content-primary">
                        {exercise.name}
                      </Text>
                      {exercise.muscleGroup ? (
                        <View className="mt-1 self-start rounded-full bg-brand-soft px-2.5 py-0.5">
                          <Text className="text-xs font-semibold text-brand">
                            {exercise.muscleGroup}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View className="mt-3 border-t border-black/5 pt-2">
                    {exercise.sets.map((set, setIndex) => (
                      <View key={set.id} className="flex-row items-center justify-between py-1.5">
                        <Text className="text-sm text-content-secondary">
                          {t('workouts.setLabel', { number: setIndex + 1 })}
                        </Text>
                        <Text className="text-sm font-semibold text-content-primary">
                          {formatSet(set)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              ))}

              {workout.notes ? (
                <Animated.View
                  entering={FadeInDown.delay(160).springify()}
                  className="mt-4 rounded-3xl border border-black/5 bg-ink-900 p-5"
                >
                  <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                    {t('workouts.notesLabel')}
                  </Text>
                  <Text className="mt-2 text-sm leading-relaxed text-content-secondary">
                    {workout.notes}
                  </Text>
                </Animated.View>
              ) : null}

              <View className="mt-8">
                <Button
                  label={t(confirmingDelete ? 'workouts.confirmDelete' : 'workouts.deleteWorkout')}
                  variant="destructive"
                  loading={deleteMutation.isPending}
                  onPress={remove}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
