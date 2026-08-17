import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { theme } from '../../../theme';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { parseDecimal } from '../../goals/helpers';
import { formatSet, isDraftSubmittable } from '../helpers';
import { useCreateWorkout } from '../hooks';
import type { WorkoutExerciseInput } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddWorkout'>;

interface SetDraft {
  reps: string;
  weight: string;
  rpe: string;
}

const EMPTY_SET: SetDraft = { reps: '', weight: '', rpe: '' };

export function AddWorkoutScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const createMutation = useCreateWorkout();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [exercises, setExercises] = useState<WorkoutExerciseInput[]>([]);
  const [exerciseName, setExerciseName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  // Per-exercise set drafts, keyed by exercise index.
  const [setDrafts, setSetDrafts] = useState<Record<number, SetDraft>>({});

  const addExercise = () => {
    if (exerciseName.trim() === '') return;
    setExercises((current) => [
      ...current,
      {
        name: exerciseName.trim(),
        ...(muscleGroup.trim() ? { muscleGroup: muscleGroup.trim() } : {}),
        sets: [],
      },
    ]);
    setExerciseName('');
    setMuscleGroup('');
  };

  const removeExercise = (index: number) => {
    setExercises((current) => current.filter((_, i) => i !== index));
  };

  const setDraftFor = (index: number): SetDraft => setDrafts[index] ?? EMPTY_SET;

  const addSet = (index: number) => {
    const draft = setDraftFor(index);
    const reps = parseDecimal(draft.reps);
    const weight = draft.weight.trim() === '' ? undefined : parseDecimal(draft.weight);
    const rpe = draft.rpe.trim() === '' ? undefined : parseDecimal(draft.rpe);
    if (reps === null || weight === null || rpe === null) return;
    setExercises((current) =>
      current.map((exercise, i) =>
        i === index
          ? {
              ...exercise,
              sets: [
                ...exercise.sets,
                {
                  repetitions: Math.round(reps),
                  ...(weight !== undefined ? { weightKg: weight } : {}),
                  ...(rpe !== undefined ? { rpe } : {}),
                },
              ],
            }
          : exercise,
      ),
    );
    setSetDrafts((current) => ({ ...current, [index]: EMPTY_SET }));
  };

  const parsedDuration = duration.trim() === '' ? undefined : parseDecimal(duration);
  const canSubmit = isDraftSubmittable(name, exercises) && parsedDuration !== null;

  const submit = () => {
    if (!canSubmit || createMutation.isPending) return;
    createMutation.mutate(
      {
        name: name.trim(),
        performedAt: new Date().toISOString(),
        ...(parsedDuration !== undefined
          ? { durationMinutes: Math.round(parsedDuration ?? 0) }
          : {}),
        exercises,
      },
      { onSuccess: () => navigation.goBack() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('workouts.new')} />

          <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-6 gap-4">
            <AuthTextField
              label={t('workouts.name')}
              placeholder={t('workouts.namePlaceholder')}
              value={name}
              onChangeText={setName}
            />
            <AuthTextField
              label={t('workouts.duration')}
              placeholder="60"
              keyboardType="number-pad"
              value={duration}
              onChangeText={setDuration}
            />
          </Animated.View>

          {exercises.map((exercise, index) => {
            const draft = setDraftFor(index);
            return (
              <Animated.View
                key={`${exercise.name}-${index}`}
                entering={FadeInDown.springify()}
                className="mt-6 rounded-3xl border border-white/5 bg-ink-900 p-5"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-content-primary">
                      {exercise.name}
                    </Text>
                    {exercise.muscleGroup ? (
                      <Text className="mt-0.5 text-xs uppercase tracking-widest text-content-tertiary">
                        {exercise.muscleGroup}
                      </Text>
                    ) : null}
                  </View>
                  <PressableScale
                    onPress={() => removeExercise(index)}
                    accessibilityRole="button"
                    accessibilityLabel={t('workouts.removeExercise')}
                    className="h-9 w-9 items-center justify-center rounded-full bg-ink-800"
                  >
                    <Ionicons name="close" size={16} color={theme.colors.content.secondary} />
                  </PressableScale>
                </View>

                {exercise.sets.length > 0 ? (
                  <View className="mt-3 border-t border-white/5 pt-3">
                    {exercise.sets.map((set, setIndex) => (
                      <Text key={setIndex} className="py-0.5 text-sm text-content-secondary">
                        {t('workouts.setLabel', { number: setIndex + 1 })} · {formatSet(set)}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View className="mt-4 flex-row items-end gap-2">
                  <View className="flex-1">
                    <AuthTextField
                      label={t('workouts.reps')}
                      placeholder="8"
                      keyboardType="number-pad"
                      value={draft.reps}
                      onChangeText={(text) =>
                        setSetDrafts((current) => ({
                          ...current,
                          [index]: { ...draft, reps: text },
                        }))
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <AuthTextField
                      label={t('workouts.weight')}
                      placeholder="80"
                      keyboardType="decimal-pad"
                      value={draft.weight}
                      onChangeText={(text) =>
                        setSetDrafts((current) => ({
                          ...current,
                          [index]: { ...draft, weight: text },
                        }))
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <AuthTextField
                      label={t('workouts.rpe')}
                      placeholder="8"
                      keyboardType="decimal-pad"
                      value={draft.rpe}
                      onChangeText={(text) =>
                        setSetDrafts((current) => ({
                          ...current,
                          [index]: { ...draft, rpe: text },
                        }))
                      }
                    />
                  </View>
                  <PressableScale
                    onPress={() => addSet(index)}
                    accessibilityRole="button"
                    accessibilityLabel={t('workouts.addSet')}
                    className="h-[52px] w-[52px] items-center justify-center rounded-2xl bg-brand-soft"
                  >
                    <Ionicons name="add" size={22} color={theme.colors.brand.DEFAULT} />
                  </PressableScale>
                </View>
              </Animated.View>
            );
          })}

          <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('workouts.addExercise')}
            </Text>
            <View className="gap-4 rounded-3xl border border-white/5 bg-ink-900 p-5">
              <AuthTextField
                label={t('workouts.exerciseName')}
                placeholder={t('workouts.exerciseNamePlaceholder')}
                value={exerciseName}
                onChangeText={setExerciseName}
              />
              <AuthTextField
                label={t('workouts.muscleGroup')}
                placeholder={t('workouts.muscleGroupPlaceholder')}
                value={muscleGroup}
                onChangeText={setMuscleGroup}
              />
              <PressableScale
                onPress={addExercise}
                disabled={exerciseName.trim() === ''}
                accessibilityRole="button"
                className={`rounded-2xl border border-brand/40 py-3 ${
                  exerciseName.trim() === '' ? 'opacity-40' : ''
                }`}
              >
                <Text className="text-center text-sm font-semibold text-brand">
                  {t('workouts.addExerciseAction')}
                </Text>
              </PressableScale>
            </View>

            {createMutation.isError ? (
              <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
            ) : null}

            <View className="mt-8">
              <AuthSubmitButton
                label={t('workouts.save')}
                loading={createMutation.isPending}
                onPress={submit}
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
