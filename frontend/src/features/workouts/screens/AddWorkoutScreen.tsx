import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { theme } from '../../../theme';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { parseDecimal } from '../../goals/helpers';
import { uploadExercisePhoto } from '../api';
import { formatSet, isDraftSubmittable } from '../helpers';
import { useCreateWorkout } from '../hooks';
import type { WorkoutExerciseInput } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddWorkout'>;

interface SetDraft {
  reps: string;
  weight: string;
  rpe: string;
}

interface PickedPhoto {
  uri: string;
  mimeType: string;
  fileName: string;
}

/** Photos stay local until submit; they upload right before the workout is created. */
interface ExerciseDraft extends WorkoutExerciseInput {
  photo?: PickedPhoto;
}

const EMPTY_SET: SetDraft = { reps: '', weight: '', rpe: '' };

export function AddWorkoutScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const createMutation = useCreateWorkout();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [exerciseName, setExerciseName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  // Per-exercise set drafts, keyed by exercise index.
  const [setDrafts, setSetDrafts] = useState<Record<number, SetDraft>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const pickedExercise = route.params?.pickedExercise;

  const addPickedExercise = () => {
    if (!pickedExercise) return;
    setExercises((current) => [
      ...current,
      { name: pickedExercise.name, muscleGroup: pickedExercise.muscleGroup, sets: [] },
    ]);
    navigation.setParams({ pickedExercise: undefined });
  };

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

  const pickPhoto = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const photo: PickedPhoto = {
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? 'exercise.jpg',
    };
    setExercises((current) =>
      current.map((exercise, i) => (i === index ? { ...exercise, photo } : exercise)),
    );
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

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      const payload: WorkoutExerciseInput[] = [];
      for (const { photo, ...exercise } of exercises) {
        if (photo) {
          const uploaded = await uploadExercisePhoto(photo);
          payload.push({ ...exercise, imageKey: uploaded.photo.imageKey });
        } else {
          payload.push(exercise);
        }
      }
      await createMutation.mutateAsync({
        name: name.trim(),
        performedAt: new Date().toISOString(),
        ...(parsedDuration !== undefined
          ? { durationMinutes: Math.round(parsedDuration ?? 0) }
          : {}),
        exercises: payload,
      });
      navigation.goBack();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
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
                className="mt-6 rounded-3xl border border-black/5 bg-ink-900 p-5"
              >
                <View className="flex-row items-center justify-between">
                  <PressableScale
                    onPress={() => void pickPhoto(index)}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      exercise.photo ? 'workouts.changePhoto' : 'workouts.addPhoto',
                    )}
                    className="mr-3 h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-brand-soft"
                  >
                    {exercise.photo ? (
                      <Image
                        source={{ uri: exercise.photo.uri }}
                        className="h-12 w-12 bg-ink-800"
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <Ionicons
                        name="camera-outline"
                        size={20}
                        color={theme.colors.brand.DEFAULT}
                      />
                    )}
                  </PressableScale>
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
                  <View className="mt-3 border-t border-black/5 pt-3">
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

            {pickedExercise ? (
              <View className="mb-4 flex-row items-center gap-3 rounded-3xl border border-brand/30 bg-brand-soft p-4">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-content-primary">
                    {pickedExercise.name}
                  </Text>
                  <Text className="mt-0.5 text-xs uppercase tracking-widest text-content-tertiary">
                    {pickedExercise.muscleGroup}
                  </Text>
                </View>
                <PressableScale
                  onPress={addPickedExercise}
                  accessibilityRole="button"
                  className="rounded-2xl bg-charcoal px-4 py-2.5"
                >
                  <Text className="text-sm font-semibold text-white">
                    {t('workouts.addPicked')}
                  </Text>
                </PressableScale>
                <PressableScale
                  onPress={() => navigation.setParams({ pickedExercise: undefined })}
                  accessibilityRole="button"
                  accessibilityLabel={t('workouts.discardPicked')}
                  className="h-9 w-9 items-center justify-center rounded-full bg-ink-900"
                >
                  <Ionicons name="close" size={16} color={theme.colors.content.secondary} />
                </PressableScale>
              </View>
            ) : null}

            <PressableScale
              onPress={() => navigation.navigate('ExerciseBrowser', { picker: true })}
              accessibilityRole="button"
              className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl border border-brand/40 py-3"
            >
              <Ionicons name="body-outline" size={18} color={theme.colors.brand.DEFAULT} />
              <Text className="text-sm font-semibold text-brand">
                {t('workouts.pickFromCatalog')}
              </Text>
            </PressableScale>

            <View className="gap-4 rounded-3xl border border-black/5 bg-ink-900 p-5">
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

            {saveError ? (
              <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
            ) : null}

            <View className="mt-8">
              <AuthSubmitButton
                label={t('workouts.save')}
                loading={saving}
                onPress={() => void submit()}
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
